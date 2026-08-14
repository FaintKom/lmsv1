"""Minimal client for an OpenAI-compatible chat-completions endpoint.

Deliberately small. One function, no streaming, no tool calls, no retries —
the only caller is the lesson Q&A endpoint, which asks one question and shows
one answer. Anything beyond that belongs to whoever needs it, not here.

The provider is whatever ``LLM_BASE_URL`` points at: OpenRouter, a local
Ollama, vLLM. They all speak the same request shape, so switching provider is
an env change rather than a code change.
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 30


class LLMNotConfiguredError(RuntimeError):
    """No API key set. The feature is off, not broken — callers answer 503."""


class LLMError(RuntimeError):
    """The provider was reached but did not return a usable answer."""


async def complete(system: str, user: str, *, max_tokens: int = 700) -> str:
    """Send one system + one user message, return the assistant's text.

    Raises LLMNotConfiguredError when no key is set, and LLMError for every
    upstream failure — a timeout, a non-2xx status, or a response whose
    shape does not match what an OpenAI-compatible endpoint promises.
    """
    if not settings.llm_api_key or not settings.llm_model:
        raise LLMNotConfiguredError("LLM_API_KEY / LLM_MODEL are not configured")

    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError as exc:  # timeout, DNS, connection reset
        logger.warning("LLM request failed: %s", exc)
        raise LLMError("could not reach the language model") from exc

    if response.status_code != 200:
        # Body is truncated on purpose: provider errors can echo the request,
        # and the request contains lesson text we have no reason to log.
        logger.warning("LLM returned %s: %s", response.status_code, response.text[:200])
        raise LLMError(f"language model returned {response.status_code}")

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.warning("Unexpected LLM response shape: %s", response.text[:200])
        raise LLMError("unexpected response from the language model") from exc

    if not isinstance(content, str) or not content.strip():
        raise LLMError("language model returned an empty answer")

    return content.strip()
