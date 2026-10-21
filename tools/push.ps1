# 推送脚本：GitHub HTTPS 被污染时自动走本地 CONNECT 代理
# 用法：powershell -ExecutionPolicy Bypass -File tools\push.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$proxyPort = 7899
$token = $env:GITHUB_TOKEN
if (-not $token) {
    $remote = & git remote get-url origin 2>$null
    if ($remote -match 'https://([^@/]+)@') { $token = $Matches[1] }
}

# 1) 若代理未运行则启动
$running = Get-NetTCPConnection -LocalPort $proxyPort -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Write-Host "启动本地 git 代理（127.0.0.1:$proxyPort）…"
    $node = (Get-Command node -ErrorAction SilentlyContinue)
    if (-not $node) { $node = 'E:\nodejs\node.exe' } else { $node = $node.Source }
    Start-Process -FilePath $node -ArgumentList "$root\tools\git-proxy.js" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 2) 探测代理
$probe = & curl.exe -s -o NUL -w '%{http_code}' --max-time 12 -x "http://127.0.0.1:$proxyPort" 'https://github.com' 2>$null
if ($probe -ne '200') {
    Write-Host "代理不可用（探测 $probe），尝试直连…"
}

# 3) 推送
$args = @('-c', "http.proxy=http://127.0.0.1:$proxyPort", '-c', "https.proxy=http://127.0.0.1:$proxyPort", 'push')
if ($token) { $args += @("https://$token@github.com/ttt123-ll/astro-exploration.git", 'main:main') }
else { $args += @('origin', 'main:main') }

& git @args
if ($LASTEXITCODE -eq 0) { Write-Host "✓ 推送成功" } else { Write-Host "✗ 推送失败" -ForegroundColor Red }
