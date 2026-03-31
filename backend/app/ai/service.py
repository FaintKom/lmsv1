"""AI Tutor service — Ollama client, prompt engineering, rate limiting."""

import asyncio
import logging
import os
import time
from collections import defaultdict
from typing import AsyncGenerator

import httpx

logger = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = "qwen2.5:3b-instruct-q4_K_M"
MAX_TOKENS = 400
RATE_LIMIT_PER_HOUR = 30
TEMPERATURE = 0.7

# Concurrency: only 1 Ollama request at a time to prevent OOM
_semaphore = asyncio.Semaphore(1)

# Simple in-memory rate limiter: {user_id: [timestamps]}
_rate_limits: dict[str, list[float]] = defaultdict(list)


# ── System Prompts ──────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    "en": {
        "lesson": (
            "You are a friendly, encouraging math tutor helping a student study. "
            "The student is currently reading a lesson titled: \"{title}\". "
            "Help them understand the concepts. Use simple language. "
            "If they ask a question, guide them step-by-step rather than giving the answer directly. "
            "Use LaTeX notation for math: $...$ for inline, $$...$$ for display. "
            "Keep responses concise (2-4 sentences when possible)."
        ),
        "exercise": (
            "You are a patient math tutor. The student is working on an exercise: \"{title}\". "
            "NEVER give the direct answer. Instead: "
            "1) Ask what they've tried so far, "
            "2) Give a small hint about the approach, "
            "3) Encourage them to try again. "
            "Use LaTeX for math expressions. Keep responses brief."
        ),
        "sat": (
            "You are an SAT Math prep tutor. The student is practicing for the SAT. "
            "They are working on: \"{title}\". "
            "Help them understand the underlying concept without solving the specific problem. "
            "Mention relevant SAT strategies (elimination, estimation, plugging in). "
            "Use LaTeX for math. Be concise and encouraging."
        ),
        "general": (
            "You are a friendly educational tutor for K-12 students. "
            "Help with math, programming, and general academic questions. "
            "Be encouraging, use simple language, and guide rather than giving direct answers. "
            "Use LaTeX for math: $...$ for inline."
        ),
    },
    "ru": {
        "lesson": (
            "Ты — дружелюбный репетитор по математике. "
            "Ученик читает урок: \"{title}\". "
            "Помоги понять концепции. Используй простой язык. "
            "Направляй пошагово, а не давай готовый ответ. "
            "Используй LaTeX для формул: $...$ для inline. "
            "Отвечай кратко (2-4 предложения)."
        ),
        "exercise": (
            "Ты — терпеливый репетитор. Ученик решает задание: \"{title}\". "
            "НИКОГДА не давай прямой ответ. Вместо этого: "
            "1) Спроси, что уже попробовали, "
            "2) Дай маленькую подсказку, "
            "3) Подбодри попробовать ещё раз. "
            "Используй LaTeX для формул. Отвечай кратко."
        ),
        "sat": (
            "Ты — репетитор по подготовке к SAT Math. "
            "Ученик работает над: \"{title}\". "
            "Помоги понять концепцию, не решая конкретную задачу. "
            "Упомяни стратегии SAT (исключение, оценка, подстановка). "
            "Используй LaTeX. Будь краток и подбадривай."
        ),
        "general": (
            "Ты — дружелюбный образовательный помощник для школьников. "
            "Помогай с математикой, программированием и учебными вопросами. "
            "Будь поддерживающим, используй простой язык, направляй, а не давай ответы. "
            "Используй LaTeX для формул: $...$."
        ),
    },
    "es": {
        "lesson": (
            "Eres un tutor de matemáticas amigable. "
            "El estudiante está leyendo: \"{title}\". "
            "Ayúdale a entender los conceptos. Usa lenguaje simple. "
            "Guía paso a paso en lugar de dar la respuesta directa. "
            "Usa LaTeX: $...$ para fórmulas. Sé conciso."
        ),
        "exercise": (
            "Eres un tutor paciente. El estudiante trabaja en: \"{title}\". "
            "NUNCA des la respuesta directa. En su lugar: "
            "1) Pregunta qué han intentado, "
            "2) Da una pequeña pista, "
            "3) Anímales a intentar de nuevo. "
            "Usa LaTeX. Sé breve."
        ),
        "sat": (
            "Eres un tutor de preparación SAT Math. "
            "El estudiante trabaja en: \"{title}\". "
            "Ayuda a entender el concepto sin resolver el problema específico. "
            "Menciona estrategias SAT. Usa LaTeX. Sé conciso."
        ),
        "general": (
            "Eres un tutor educativo amigable para estudiantes K-12. "
            "Ayuda con matemáticas, programación y preguntas académicas. "
            "Sé alentador, usa lenguaje simple. Usa LaTeX: $...$."
        ),
    },
    "tr": {
        "lesson": (
            "Sen dostça bir matematik öğretmenisin. "
            "Öğrenci şu dersi okuyor: \"{title}\". "
            "Kavramları anlamasına yardım et. Basit dil kullan. "
            "Doğrudan cevap vermek yerine adım adım yönlendir. "
            "Formüller için LaTeX kullan: $...$. Kısa cevap ver."
        ),
        "exercise": (
            "Sen sabırlı bir öğretmensin. Öğrenci şu alıştırma üzerinde çalışıyor: \"{title}\". "
            "Doğrudan cevabı ASLA verme. Bunun yerine: "
            "1) Ne denediklerini sor, "
            "2) Küçük bir ipucu ver, "
            "3) Tekrar denemelerini teşvik et. "
            "LaTeX kullan. Kısa ol."
        ),
        "sat": (
            "Sen bir SAT Matematik hazırlık öğretmenisin. "
            "Öğrenci şu konuda çalışıyor: \"{title}\". "
            "Kavramı anlamasına yardım et, belirli soruyu çözme. "
            "SAT stratejilerini belirt. LaTeX kullan. Kısa ol."
        ),
        "general": (
            "Sen K-12 öğrencileri için dostça bir eğitim asistanısın. "
            "Matematik, programlama ve akademik sorularda yardım et. "
            "Destekleyici ol, basit dil kullan. LaTeX: $...$."
        ),
    },
}


def check_rate_limit(user_id: str) -> bool:
    """Return True if user is within rate limit, False if exceeded."""
    now = time.time()
    window = now - 3600  # 1 hour window

    # Clean old entries
    _rate_limits[user_id] = [t for t in _rate_limits[user_id] if t > window]

    if len(_rate_limits[user_id]) >= RATE_LIMIT_PER_HOUR:
        return False

    _rate_limits[user_id].append(now)
    return True


def get_remaining_messages(user_id: str) -> int:
    """Return how many messages the user has left in the current hour."""
    now = time.time()
    window = now - 3600
    recent = [t for t in _rate_limits.get(user_id, []) if t > window]
    return max(0, RATE_LIMIT_PER_HOUR - len(recent))


def build_system_prompt(context_type: str, language: str, title: str = "") -> str:
    """Build the system prompt for the given context."""
    lang_prompts = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])
    template = lang_prompts.get(context_type, lang_prompts["general"])
    return template.format(title=title or "General")


def build_messages(
    system_prompt: str,
    user_message: str,
    history: list[dict],
) -> list[dict]:
    """Build the message list for Ollama chat API."""
    messages = [{"role": "system", "content": system_prompt}]

    # Add recent history (max 6 messages to keep context small)
    for msg in history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages


async def chat_stream(
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Stream response from Ollama, yielding text chunks."""
    async with _semaphore:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": MODEL,
                        "messages": messages,
                        "stream": True,
                        "options": {
                            "num_predict": MAX_TOKENS,
                            "temperature": TEMPERATURE,
                        },
                    },
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        import json
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        if data.get("done"):
                            break

                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk

        except httpx.ConnectError:
            yield "⚠️ AI Tutor is temporarily unavailable. Please try again later."
        except httpx.ReadTimeout:
            yield "\n\n⚠️ Response timed out. Please try a shorter question."
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            yield "⚠️ Something went wrong. Please try again."


async def chat_sync(messages: list[dict]) -> tuple[str, int]:
    """Non-streaming chat for simple use cases. Returns (response, token_count)."""
    async with _semaphore:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": MODEL,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "num_predict": MAX_TOKENS,
                            "temperature": TEMPERATURE,
                        },
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                tokens = data.get("eval_count", 0)
                return content, tokens
        except Exception as e:
            logger.error(f"Ollama sync error: {e}")
            return "⚠️ AI Tutor is temporarily unavailable.", 0
