@echo off
title ZeroTrustX - Zero Trust Access Management System
color 0B

echo ======================================================================
echo    * ZeroTrustX - Zero Trust Enterprise Access Management Platform
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Step 1/3: Checking MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MongoDB service is active.
) else (
    echo [OK] MongoDB is running or managed as service.
)

echo.
echo [*] Step 2/3: Seeding initial permissions, roles, policies, and admin...
call npm run seed
echo.

echo [*] Step 3/3: Starting Backend API (Port 5000) and Frontend UI (Port 5173)...
echo.
echo ======================================================================
echo    PLATFORM CREDENTIALS & URLS
echo ======================================================================
echo    Frontend URL:     http://localhost:5173/
echo    Backend API:      http://localhost:5000/api/v1
echo.
echo    Default Admin Credentials:
echo      Email:          admin@zerotrustx.local
echo      Password:       AdminPass@123
echo.
echo    Tip: You can also click "Create account" to register your own user.
echo ======================================================================
echo.
echo [*] Opening browser to http://localhost:5173/...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/"

call npm run dev

pause
