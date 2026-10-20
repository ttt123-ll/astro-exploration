@echo off
chcp 65001 >nul
title 查看 Git 提交记录 - 宇宙探索天文科普网站
cd /d "%~dp0"

echo ============================================
echo   宇宙探索 · 天文科普网站  -  Git 提交记录
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 git，请先安装 Git for Windows。
    pause
    exit /b 1
)

echo [1/2] 生成可视化提交记录页面 ...
where node >nul 2>nul
if errorlevel 1 (
    echo        未找到 node，跳过页面生成，改为命令行显示。
    echo.
    git --no-pager log --graph --pretty=format:"%%h  %%ad  %%s" --date=format:"%%Y-%%m-%%d %%H:%%M"
    echo.
    pause
    exit /b 0
)
node tools\gen-git-history.js

echo.
echo [2/2] 在浏览器中打开 ...
if exist "git-history.html" (
    start "" "git-history.html"
    echo        已打开 git-history.html
) else (
    echo        [警告] 页面生成失败，改用命令行显示：
    git --no-pager log --graph --pretty=format:"%%h  %%ad  %%s" --date=format:"%%Y-%%m-%%d %%H:%%M"
    pause
)

echo.
echo --------------------------------------------
echo  其他查看方式：
echo    命令行    git log --oneline --graph
echo    图形界面  gitk
echo    导出补丁  git format-patch -1
echo --------------------------------------------
echo.
timeout /t 4 >nul
