@echo off
echo Stopping GrassLMS production services...
docker compose -f docker-compose.prod.yml down
echo.
echo All services stopped.
echo Data is preserved in Docker volumes.
echo Run deploy.bat to start again.
pause
