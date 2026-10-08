@echo off
if exist "E:\mysql\bin\mysqld.exe" (
    echo Starting MySQL database ...
    start "MySQL" /min "E:\mysql\bin\mysqld.exe" --defaults-file=E:\mysql\my.ini
    echo MySQL started. Data dir: E:\mysql\data
    echo Stop it with stop-db.bat
) else (
    echo [ERROR] E:\mysql\bin\mysqld.exe not found.
)
timeout /t 3 >nul
