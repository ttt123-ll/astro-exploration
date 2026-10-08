@echo off
echo Stopping MySQL ...
"E:\mysql\bin\mysqladmin.exe" -u root -proot123 shutdown 2>nul
if %errorlevel% neq 0 (
    echo Graceful shutdown failed, forcing ...
    taskkill /f /im mysqld.exe 2>nul
)
echo MySQL stopped.
timeout /t 2 >nul
