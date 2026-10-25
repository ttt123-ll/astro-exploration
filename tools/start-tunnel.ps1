# Cloudflare Quick Tunnel 一键启动脚本
# 用法：powershell -ExecutionPolicy Bypass -File tools\start-tunnel.ps1 [-Port 3001]
param(
    [int]$Port = 3001
)

$ErrorActionPreference = 'Stop'
$localHost = '127.0.0.1'
$local = "http://${localHost}:${Port}"

# 1) cloudflared 路径：优先项目约定目录，其次 PATH
$candidates = @(
    'F:\离线分发包\cloudflared\cloudflared.exe',
    (Join-Path $PSScriptRoot 'cloudflared.exe')
)
$exe = $null
foreach ($c in $candidates) { if (Test-Path $c) { $exe = $c; break } }
if (-not $exe) {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { $exe = $cmd.Source }
}
if (-not $exe) {
    Write-Host "未找到 cloudflared.exe" -ForegroundColor Red
    Write-Host "请下载 cloudflared-windows-amd64.exe 放到 F:\离线分发包\cloudflared\cloudflared.exe" -ForegroundColor Yellow
    Write-Host "下载地址：https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Yellow
    exit 1
}

# 2) 检查本地站点
Write-Host "检查本地站点 $local ..." -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$local/api/health" -TimeoutSec 8 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
} catch {
    Write-Host "站点未就绪：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请先启动站点（Docker：docker compose up -d；或 npm start）" -ForegroundColor Yellow
    exit 1
}
Write-Host "站点正常" -ForegroundColor Green

# 3) 启动隧道
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$outLog = Join-Path $env:TEMP 'astro-tunnel-out.log'
$errLog = Join-Path $env:TEMP 'astro-tunnel-err.log'
Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue

Write-Host "启动 Cloudflare 隧道 ..." -ForegroundColor Cyan
Start-Process -FilePath $exe -ArgumentList 'tunnel', '--url', $local, '--no-autoupdate' `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden | Out-Null

# 4) 等待公网地址
$url = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    foreach ($f in @($outLog, $errLog)) {
        if (Test-Path $f) {
            $m = Select-String -Path $f -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($m) { $url = $m.Matches[0].Value; break }
        }
    }
    if ($url) { break }
}

if (-not $url) {
    Write-Host "未获取到公网地址，日志：" -ForegroundColor Red
    if (Test-Path $errLog) { Get-Content $errLog -Tail 20 }
    exit 1
}

$addrFile = 'F:\离线分发包\在线演示地址.txt'
@(
    "公网地址：$url",
    "本地地址：$local",
    "生成时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "评审账号：admin / admin123",
    "停止隧道：Get-Process cloudflared | Stop-Process -Force"
) | Set-Content -Path $addrFile -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "公网演示地址：$url" -ForegroundColor Green
Write-Host "评审账号：admin / admin123" -ForegroundColor Green
Write-Host "地址已保存到：$addrFile" -ForegroundColor Green
Write-Host "保持本机开机；关闭隧道：Get-Process cloudflared | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green
