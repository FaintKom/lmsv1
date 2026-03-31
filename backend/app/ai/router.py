"""AI Tutor router — streaming chat endpoint."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.ai.schemas import AiChatRequest, AiChatResponse
from app.ai.service import (
    build_messages,
    build_system_prompt,
    chat_stream,
    chat_sync,
    check_rate_limit,
    get_remaining_messages,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat")
async def chat(
    req: AiChatRequest,
    user: User = Depends(get_current_user),
):
    """Streaming AI tutor chat. Returns SSE text/event-stream."""
    user_id = str(user.id)

    # Rate limit check
    if not check_rate_limit(user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can send 30 messages per hour.",
        )

    # Build prompt
    title = req.lesson_title or req.exercise_title or ""
    system_prompt = build_system_prompt(req.context_type.value, req.language, title)
    messages = build_messages(system_prompt, req.message, req.history)

    remaining = get_remaining_messages(user_id)

    async def event_generator():
        async for chunk in chat_stream(messages):
            # SSE format: data: {json}\n\n
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        # Send done event with remaining messages
        yield f"data: {json.dumps({'done': True, 'remaining': remaining - 1})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/sync", response_model=AiChatResponse)
async def chat_sync_endpoint(
    req: AiChatRequest,
    user: User = Depends(get_current_user),
):
    """Non-streaming AI tutor chat. Returns full response at once."""
    user_id = str(user.id)

    if not check_rate_limit(user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can send 30 messages per hour.",
        )

    title = req.lesson_title or req.exercise_title or ""
    system_prompt = build_system_prompt(req.context_type.value, req.language, title)
    messages = build_messages(system_prompt, req.message, req.history)

    response, tokens = await chat_sync(messages)
    return AiChatResponse(response=response, tokens_used=tokens)


@router.get("/status")
async def ai_status(user: User = Depends(get_current_user)):
    """Check AI tutor availability and remaining messages."""
    user_id = str(user.id)
    remaining = get_remaining_messages(user_id)

    # Quick health check on Ollama
    import httpx
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            available = resp.status_code == 200
    except Exception:
        available = False

    return {
        "available": available,
        "remaining_messages": remaining,
        "max_messages_per_hour": 30,
    }
