@echo off
title ZeroTrustX - Stop Services
color 0C

echo ======================================================================
echo    ZeroTrustX - Stop Running Processes
echo ======================================================================
echo.

echo [*] Terminating Node processes on port 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

echo [OK] All ZeroTrustX web and API processes stopped.
echo.
pause
