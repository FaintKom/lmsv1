@echo off
setlocal enabledelayedexpansion
title GrassLMS — Production Deploy
echo.
echo  ============================================
echo   GrassLMS — Production Deployment
echo  ============================================
echo.

:: Step 1: Check Docker
echo [1/5] Checking Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker Desktop is not installed.
    echo.
    echo  Please install Docker Desktop from:
    echo  https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo  After installing, restart your PC and run this script again.
    echo.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker Desktop is not running.
    echo  Please start Docker Desktop and wait for it to be ready.
    echo.
    pause
    exit /b 1
)
echo     Docker is ready.

:: Step 2: Generate .env if not exists
echo [2/5] Setting up environment...
if not exist .env (
    echo     Generating secure .env file...

    :: Generate random passwords using PowerShell
    for /f "tokens=*" %%a in ('powershell -Command "[System.Guid]::NewGuid().ToString('N').Substring(0,32)"') do set PG_PASS=%%a
    for /f "tokens=*" %%a in ('powershell -Command "[System.Guid]::NewGuid().ToString('N') + [System.Guid]::NewGuid().ToString('N')"') do set JWT_SEC=%%a

    (
        echo # === GrassLMS — Auto-generated Production Config ===
        echo.
        echo # Database
        echo POSTGRES_DB=lms
        echo POSTGRES_USER=lms
        echo POSTGRES_PASSWORD=!PG_PASS!
        echo DATABASE_URL=postgresql+asyncpg://lms:!PG_PASS!@db:5432/lms
        echo.
        echo # JWT
        echo JWT_SECRET=!JWT_SEC!
        echo JWT_ALGORITHM=HS256
        echo JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
        echo.
        echo # CORS - will be updated after tunnel starts
        echo CORS_ORIGINS=http://localhost:3000,http://localhost:80
        echo.
        echo # Sandbox
        echo SANDBOX_URL=http://sandbox:8001
        echo.
        echo # Stripe - leave empty for demo
        echo STRIPE_SECRET_KEY=
        echo STRIPE_WEBHOOK_SECRET=
        echo.
        echo # App
        echo APP_NAME=GrassLMS
        echo DEBUG=true
    ) > .env

    echo     .env file created with secure random secrets.
) else (
    echo     .env file already exists, keeping it.
)

:: Step 3: Build Docker images
echo [3/5] Building Docker images (this may take 5-10 minutes)...
docker compose -f docker-compose.prod.yml build
if errorlevel 1 (
    echo.
    echo  ERROR: Docker build failed. Check the output above.
    pause
    exit /b 1
)
echo     Build complete.

:: Step 4: Start services
echo [4/5] Starting services...
docker compose -f docker-compose.prod.yml up -d
if errorlevel 1 (
    echo.
    echo  ERROR: Failed to start services. Check: docker compose -f docker-compose.prod.yml logs
    pause
    exit /b 1
)

:: Step 5: Wait and show info
echo [5/5] Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo  ============================================
echo   GrassLMS is running!
echo  ============================================
echo.
echo   Local access:     http://localhost
echo   API docs:         http://localhost/docs
echo.
echo   Cloudflare Tunnel URL (your public address):
echo.

:: Try to get the tunnel URL from cloudflared logs
for /f "tokens=*" %%a in ('docker compose -f docker-compose.prod.yml logs cloudflared 2^>^&1 ^| findstr "trycloudflare.com"') do (
    echo   %%a
)

echo.
echo   After you see the tunnel URL above, update CORS_ORIGINS
echo   in .env with that URL, then run:
echo     docker compose -f docker-compose.prod.yml restart backend
echo.
echo   To view logs:
echo     docker compose -f docker-compose.prod.yml logs -f
echo.
echo   To stop:
echo     stop-prod.bat
echo  ============================================
echo.
pause
