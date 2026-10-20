@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title 一键推送 - 宇宙探索天文科普网站
cd /d "%~dp0"

set GITHUB_USER=ttt123-ll
set REPO_NAME=astro-exploration
set REPO_DESC=宇宙探索 · 天文科普网站系统（Vue3 + Express + MySQL + Three.js）

echo ============================================================
echo   一键创建 GitHub 仓库并推送
echo   账号：%GITHUB_USER%    仓库：%REPO_NAME%（Public）
echo ============================================================
echo.
echo 注意：GitHub 已停用「账号密码」方式，必须使用 Personal Access Token。
echo.
echo 获取步骤（约 1 分钟）：
echo   1. 浏览器打开 https://github.com/settings/tokens/new
echo   2. Note 随便填（如 astro-push），Expiration 选 30 days
echo   3. 勾选 [x] repo  （完整仓库读写权限）
echo   4. 页面底部点 Generate token，复制生成的 ghp_ 开头的字符串
echo.
echo ------------------------------------------------------------
set /p TOKEN=请粘贴 Token 后按回车（输入内容会显示在屏幕上）:
if "%TOKEN%"=="" (
    echo.
    echo [取消] 未输入 Token。
    pause
    exit /b 1
)
echo.

echo [1/4] 检查 git 仓库 ...
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo [错误] 当前目录不是 Git 仓库。
    pause
    exit /b 1
)

echo [2/4] 验证 Token ...
curl -s -o "%TEMP%\_gh_user.json" -w "%%{http_code}" -H "Authorization: token %TOKEN%" -H "Accept: application/vnd.github+json" https://api.github.com/user > "%TEMP%\_gh_code.txt" 2>nul
set /p HTTP_CODE=<"%TEMP%\_gh_code.txt"
if not "%HTTP_CODE%"=="200" (
    echo [错误] Token 无效或权限不足（HTTP %HTTP_CODE%）。
    echo        请确认已勾选 repo 权限，且 Token 未过期。
    del "%TEMP%\_gh_user.json" "%TEMP%\_gh_code.txt" 2>nul
    pause
    exit /b 1
)
echo        Token 有效。

echo [3/4] 创建仓库 %REPO_NAME% ...
echo {"name":"%REPO_NAME%","private":false,"description":"%REPO_DESC%","has_issues":true,"has_wiki":false}> "%TEMP%\_gh_repo.json"
curl -s -o "%TEMP%\_gh_create.json" -w "%%{http_code}" -X POST ^
     -H "Authorization: token %TOKEN%" ^
     -H "Accept: application/vnd.github+json" ^
     -H "Content-Type: application/json" ^
     --data "@%TEMP%\_gh_repo.json" ^
     https://api.github.com/user/repos > "%TEMP%\_gh_code2.txt" 2>nul
set /p HTTP_CODE2=<"%TEMP%\_gh_code2.txt"
findstr /C:"\"full_name\"" "%TEMP%\_gh_create.json" >nul 2>nul
if errorlevel 1 (
    findstr /C:"already exists" "%TEMP%\_gh_create.json" >nul 2>nul
    if errorlevel 1 (
        echo [错误] 创建仓库失败（HTTP %HTTP_CODE2%）
        type "%TEMP%\_gh_create.json"
        del "%TEMP%\_gh_*.json" "%TEMP%\_gh_code*.txt" 2>nul
        pause
        exit /b 1
    ) else (
        echo        仓库已存在，直接使用。
    )
) else (
    echo        仓库创建成功：https://github.com/%GITHUB_USER%/%REPO_NAME%
)

echo.
echo [4/4] 推送代码（约 130MB，首次需几分钟，请耐心等待）...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
git push "https://%TOKEN%@github.com/%GITHUB_USER%/%REPO_NAME%.git" main:main --progress
if errorlevel 1 (
    echo.
    echo [错误] 推送失败。常见原因：
    echo   - 网络不稳定：重试一次
    echo   - Token 无 repo 权限
    echo   - 仓库已存在同名提交：先执行 git pull --rebase
    del "%TEMP%\_gh_*.json" "%TEMP%\_gh_code*.txt" 2>nul
    pause
    exit /b 1
)

rem 推送完成后把远程地址恢复成不含 Token 的干净地址
git remote set-url origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git

del "%TEMP%\_gh_*.json" "%TEMP%\_gh_code*.txt" 2>nul

echo.
echo ============================================================
echo   推送完成！
echo.
echo   仓库地址：https://github.com/%GITHUB_USER%/%REPO_NAME%
echo ============================================================
start "" "https://github.com/%GITHUB_USER%/%REPO_NAME%"
echo.
pause
