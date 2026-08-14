"""Lesson Q&A — ask a question about the lesson you are reading.

The whole lesson fits in a prompt, so there is no retrieval step, no
embeddings and no new table. One question in, one answer out, nothing stored.

Two rules shape the design:

* Only ``text`` blocks are sent to the model. ``exercise`` blocks are skipped
  on purpose — their configs hold the correct answers, and feeding them to a
  model that a student can interrogate would hand those answers out.
* The daily rate limit is the spend cap. There is no quota table; if this ever
  needs per-organisation budgeting, that is the point to add one.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.common.llm import LLMError, LLMNotConfiguredError, complete
from app.common.rate_limit import limiter
from app.courses.service import get_lesson, normalize_lesson_content
from app.db.session import get_db

router = APIRouter()

# A generous ceiling rather than a tuned one: the longest lesson we have is a
# fraction of this. It exists so an unusually long lesson degrades into a
# truncated prompt instead of a surprise bill.
# ponytail: blunt cut from the start; chunking and retrieval when lessons
# routinely exceed this.
MAX_LESSON_CHARS = 24_000

# Below this there is nothing to reason about — a video-only lesson, a file
# upload, an empty draft.
MIN_LESSON_CHARS = 50

SYSTEM_PROMPT = (
    "You are helping a student understand one lesson from their course.\n"
    "Answer using only the lesson text supplied below. If the answer is not "
    "in that text, say plainly that this lesson does not cover it, and do not "
    "fill the gap from general knowledge.\n"
    "Never reveal or guess answers to the lesson's exercises.\n"
    "Reply in the language the student asked in. Be brief: a short paragraph, "
    "or a few bullets when a list genuinely helps."
)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AskResponse(BaseModel):
    answer: str


def _user_key(request: Request) -> str:
    """Rate-limit per user, falling back to IP for unauthenticated calls.

    get_current_user sets request.state.user_id while dependencies resolve,
    which happens before slowapi's wrapper runs the handler.
    """
    return getattr(request.state, "user_id", None) or get_remote_address(request)


def _lesson_text(lesson) -> str:
    """Readable prose of a lesson, or an empty string if it has none.

    normalize_lesson_content converts the legacy ``content.body`` shape into
    v2 blocks, so only the block shape has to be handled here. Lesson types it
    cannot convert (quiz, theory, code_challenge, file_upload, interactive)
    come back untouched and yield nothing, which is correct — none of them
    carry prose to ask about.
    """
    normalized = normalize_lesson_content(
        {
            "content_type": (
                lesson.content_type.value
                if hasattr(lesson.content_type, "value")
                else lesson.content_type
            ),
            "content": dict(lesson.content or {}),
        }
    )
    content = normalized.get("content") or {}
    if content.get("version") != 2:
        return ""

    parts: list[str] = []
    for block in content.get("blocks") or []:
        if block.get("type") != "text":
            continue
        body = block.get("body") or ""
        # Tags stripped with a regex on purpose: this text goes to a language
        # model, not to a browser, so a parser would buy nothing.
        text = re.sub(r"<[^>]+>", " ", body)
        text = re.sub(r"&nbsp;", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            parts.append(text)

    return "\n\n".join(parts)[:MAX_LESSON_CHARS]


@router.post("/lessons/{lesson_id}/ask", response_model=AskResponse)
@limiter.limit("20/day", key_func=_user_key)
async def ask_about_lesson(
    request: Request,  # required by slowapi
    response: Response,  # slowapi writes the X-RateLimit-* headers into it
    lesson_id: uuid.UUID,
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AskResponse:
    # Raises NotFoundError (404) for another org's lesson, and for a student
    # who is not enrolled in an unpublished course. No access logic here.
    lesson = await get_lesson(db, lesson_id, current_user)

    text = _lesson_text(lesson)
    if len(text) < MIN_LESSON_CHARS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This lesson has no text to ask about.",
        )

    user_prompt = (
        f"Lesson title: {lesson.title}\n\n"
        f"Lesson text:\n{text}\n\n"
        f"Student's question: {payload.question}"
    )

    try:
        answer = await complete(SYSTEM_PROMPT, user_prompt)
    except LLMNotConfiguredError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The lesson assistant is not configured.",
        )
    except LLMError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The lesson assistant is temporarily unavailable.",
        )

    return AskResponse(answer=answer)
