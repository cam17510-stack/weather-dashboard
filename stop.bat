@echo off
chcp 65001 >nul
echo ========================================
echo   Weather Dashboard Stopping...
echo ========================================
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8000 "') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do (
    taskkill /PID %%a /T /F >nul 2>&1
)
echo.
echo   All processes stopped.
echo ========================================
timeout /t 3