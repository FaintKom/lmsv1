from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.math_problems.service import (
    check_answer,
    generate_algebra,
    generate_arithmetic,
    generate_geometry,
)

router = APIRouter()

GENERATORS = {
    "arithmetic": generate_arithmetic,
    "algebra": generate_algebra,
    "geometry": generate_geometry,
}


class AnswerCheck(BaseModel):
    user_answer: str
    correct_answer: str


class BatchAnswerCheck(BaseModel):
    answers: list[AnswerCheck]


@router.get("/generate")
async def generate_problems(
    type: str = Query("arithmetic", description="Problem type: arithmetic, algebra, geometry"),
    difficulty: str = Query("easy", description="Difficulty: easy, medium, hard"),
    count: int = Query(5, ge=1, le=20, description="Number of problems to generate"),
    user: User = Depends(get_current_user),
):
    """Generate randomized math problems."""
    generator = GENERATORS.get(type)
    if generator is None:
        from fastapi import HTTPException
        raise HTTPException(400, f"Unknown problem type: {type}. Must be one of: {', '.join(GENERATORS.keys())}")

    if difficulty not in ("easy", "medium", "hard"):
        from fastapi import HTTPException
        raise HTTPException(400, "Difficulty must be one of: easy, medium, hard")

    problems = [generator(difficulty) for _ in range(count)]
    return problems


@router.post("/check")
async def check_answers(data: BatchAnswerCheck, user: User = Depends(get_current_user)):
    """Check a batch of answers. Returns results with correct/incorrect status."""
    results = []
    correct_count = 0
    for item in data.answers:
        is_correct = check_answer(item.user_answer, item.correct_answer)
        if is_correct:
            correct_count += 1
        results.append({
            "user_answer": item.user_answer,
            "correct_answer": item.correct_answer,
            "is_correct": is_correct,
        })
    return {
        "results": results,
        "total": len(results),
        "correct": correct_count,
        "score_percent": round(correct_count / len(results) * 100) if results else 0,
    }
