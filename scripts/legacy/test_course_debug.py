import asyncio
import traceback

async def test():
    try:
        from app.db.session import async_session_factory
        from app.courses.service import create_course
        from app.courses.schemas import CourseCreate, CourseResponse
        from app.auth.models import User
        from sqlalchemy import select

        async with async_session_factory() as session:
            try:
                # Get existing user
                result = await session.execute(select(User).where(User.email == "final@test.com"))
                user = result.scalar_one()
                print(f"1. User: {user.email}, role={user.role}, org={user.org_id}")

                data = CourseCreate(title="Debug Course", description="Testing", category="programming")
                print("2. Creating course...")
                course = await create_course(session, data, user)
                print(f"3. Course created: {course.id}, status={course.status}, type={type(course.status)}")
                print(f"4. created_at={course.created_at}, type={type(course.created_at)}")
                print(f"5. updated_at={course.updated_at}, type={type(course.updated_at)}")

                print("6. Validating CourseResponse...")
                resp = CourseResponse.model_validate(course)
                print(f"7. OK: {resp.model_dump_json()[:200]}")

                await session.commit()
                print("8. Committed!")
            except Exception:
                await session.rollback()
                traceback.print_exc()
    except Exception:
        traceback.print_exc()

asyncio.run(test())
