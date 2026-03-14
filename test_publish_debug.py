import asyncio, traceback

async def test():
    try:
        from app.db.session import async_session_factory
        from app.courses.service import publish_course, get_course
        from app.courses.schemas import CourseResponse
        from app.auth.models import User
        from sqlalchemy import select

        async with async_session_factory() as session:
            try:
                result = await session.execute(select(User).where(User.email == "final@test.com"))
                user = result.scalar_one()

                from app.courses.models import Course
                cr = await session.execute(select(Course).where(Course.status == "draft").limit(1))
                draft = cr.scalar_one()
                print(f"1. Publishing: {draft.id} - {draft.title}")

                course = await publish_course(session, draft.id, user)
                print(f"2. Published OK, status={course.status}")

                print("3. Validating response...")
                resp = CourseResponse.model_validate(course)
                print(f"4. Response OK: {resp.title} - {resp.status}")

                await session.commit()
            except Exception:
                await session.rollback()
                traceback.print_exc()
    except Exception:
        traceback.print_exc()

asyncio.run(test())
