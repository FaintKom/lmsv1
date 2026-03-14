from fastapi import APIRouter, Query

from app.math_problems.service import (
    generate_arithmetic,
    generate_algebra,
    generate_geometry,
)

router = APIRouter()

GENERATORS = {
    "arithmetic": generate_arithmetic,
    "algebra": generate_algebra,
    "geometry": generate_geometry,
}


@router.get("/generate")
async def generate_problems(
    type: str = Query("arithmetic", description="Problem type: arithmetic, algebra, geometry"),
    difficulty: str = Query("easy", description="Difficulty: easy, medium, hard"),
    count: int = Query(5, ge=1, le=20, description="Number of problems to generate"),
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
