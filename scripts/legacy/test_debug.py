import asyncio
import traceback

async def test():
    try:
        from app.db.session import async_session_factory
        from app.auth.service import register
        from app.auth.schemas import RegisterRequest, TokenResponse, UserResponse
        from app.auth.security import create_access_token, create_refresh_token

        async with async_session_factory() as session:
            try:
                data = RegisterRequest(
                    org_name="DebugSchool",
                    full_name="Debug User",
                    email="debug@test.com",
                    password="Pass123!"
                )
                print("1. Calling register...")
                user, org = await register(session, data)
                print(f"2. User created: {user.id}, email={user.email}")
                print(f"3. User created_at: {user.created_at}, type={type(user.created_at)}")

                print("4. Creating tokens...")
                access_token = create_access_token({"sub": str(user.id)})
                refresh_token = create_refresh_token({"sub": str(user.id)})
                print("5. Tokens created OK")

                print("6. Validating UserResponse...")
                user_resp = UserResponse.model_validate(user)
                print(f"7. UserResponse OK: {user_resp}")

                print("8. Creating TokenResponse...")
                resp = TokenResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user=user_resp,
                )
                print(f"9. TokenResponse OK")
                print(f"10. JSON: {resp.model_dump_json()[:200]}")

                await session.commit()
                print("11. Committed!")
            except Exception:
                await session.rollback()
                traceback.print_exc()
    except Exception:
        traceback.print_exc()

asyncio.run(test())
