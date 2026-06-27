@echo off
chcp 65001 >nul
echo ========================================
echo   Weather Dashboard Starting...
echo ========================================
echo.
echo [1/2] Backend (port 8000)
start "Backend" cmd /k "chcp 65001 >nul && cd /d c:\Users\tm941102\Box\MyFolder\ai-app\weather\backend && call .\venv\Scripts\activate.bat && uvicorn main:app --reload"
timeout /t 3 /nobreak >nul
echo [2/2] Frontend (port 5173)
start "Frontend" cmd /k "chcp 65001 >nul && cd /d c:\Users\tm941102\Box\MyFolder\ai-app\weather\frontend && npm run dev"
echo.
echo Waiting 10 sec, then opening browser...
timeout /t 10 /nobreak >nul
start http://localhost:5173
echo.
echo ========================================
echo   Done! To stop, run stop.bat
echo ========================================
timeout /t 3