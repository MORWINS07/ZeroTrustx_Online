@echo off
title ZeroTrustX - Run End-to-End Tests
color 0A

echo ======================================================================
echo    ZeroTrustX - End-to-End Verification Test Runner
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Executing 15-step Zero Trust lifecycle test suite...
echo.

call npm run e2e

echo.
pause
