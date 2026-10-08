@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Astronomy Website System  (Vue + Express + MySQL)
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+.
    pause
    exit /b 1
)

REM ---- 1. Start MySQL if not running ----
echo [1/4] Checking MySQL ...
tasklist /fi "imagename eq mysqld.exe" 2>nul | find /i "mysqld.exe" >nul
if %errorlevel% neq 0 (
    if exist "E:\mysql\bin\mysqld.exe" (
        start "MySQL" /min "E:\mysql\bin\mysqld.exe" --defaults-file=E:\mysql\my.ini
        echo       MySQL started.
    ) else (
        echo       WARN: E:\mysql not found. Skip database step.
    )
) else (
    echo       MySQL already running.
)

REM ---- 2. Server dependencies ----
echo [2/4] Checking server dependencies ...
if not exist "server\node_modules" (
    cd server
    call npm install --no-audit --no-fund
    cd ..
)

REM ---- 3. Client dependencies + build ----
echo [3/4] Building frontend ...
cd client
if not exist "node_modules" call npm install --no-audit --no-fund
call npm run build
cd ..

REM ---- 4. Start backend (serves frontend too) ----
echo [4/4] Starting system ...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo       System already running at http://127.0.0.1:3000 - opening browser ...
    start http://127.0.0.1:3000
) else (
    cd server
    node index.js
)

echo.
echo Default admin: admin / admin123
pause
