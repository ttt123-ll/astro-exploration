# 从 NASA 官方图像库下载天文图片（公有领域）— 直接构造 CDN URL，逐级回退
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36'
$imgDir = 'F:\天文科普\client\public\assets\images\official'
$meta = 'F:\天文科普\client\src\data\official.js'
New-Item -ItemType Directory -Path $imgDir -Force | Out-Null

function Nasa-Download($name, $query) {
    $enc = [uri]::EscapeDataString($query)
    $sr = & curl.exe -s --max-time 60 -H "User-Agent: $ua" "https://images-api.nasa.gov/search?q=$enc&media_type=image" | ConvertFrom-Json
    $items = @($sr.collection.items)
    if ($items.Count -eq 0) { Write-Output "未找到: $name"; return $null }
    $nasaId = $null; $title = ''
    foreach ($it in $items) {
        if ($it.data -and $it.data[0].nasa_id) { $nasaId = $it.data[0].nasa_id; $title = $it.data[0].title; break }
    }
    if (-not $nasaId) { Write-Output "无ID: $name"; return $null }
    foreach ($size in @('large','orig','medium','small')) {
        $url = "https://images-assets.nasa.gov/image/$nasaId/${nasaId}~$size.jpg"
        $dest = Join-Path $imgDir "$name.jpg"
        & curl.exe -sL -A $ua -o $dest --retry 2 --max-time 200 $url
        if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 15000) {
            Write-Output "OK: $name.jpg | $title"
            return [pscustomobject]@{ name = $name; title = $title; nasa = $nasaId }
        }
        Remove-Item $dest -Force -ErrorAction SilentlyContinue
    }
    Write-Output "失败: $name"
    return $null
}

$metaList = @()
$targets = [ordered]@{
    'butterfly_nebula' = 'Butterfly Nebula Hubble'
    'cats_eye_nebula'  = 'Cats Eye Nebula Hubble'
    'cartwheel_galaxy' = 'Cartwheel Galaxy Webb'
    'southern_ring'    = 'Southern Ring Nebula Webb'
    'stephans_quintet' = 'Stephans Quintet Webb'
    'tarantula_nebula' = 'Tarantula Nebula'
    'helix_nebula'     = 'Helix Nebula'
    'veil_nebula'      = 'Veil Nebula Hubble'
    'trifid_nebula'    = 'Trifid Nebula'
    'webb_pillars'     = 'Pillars of Creation Webb'
}
foreach ($name in $targets.Keys) {
    $r = Nasa-Download $name $targets[$name]
    if ($r) { $metaList += $r }
    Start-Sleep -Milliseconds 300
}

# 输出元数据（标题/出处）供前端使用
$js = '// NASA 官方图像库（公有领域）\nexport default ' + (ConvertTo-Json $metaList) + ';\n'
Set-Content -Path $meta -Value $js -Encoding UTF8
Write-Output "`n下载完成，成功 $($metaList.Count) 张，元数据已写入 official.js"
Get-ChildItem $imgDir -File | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB,0)}} | Format-Table -AutoSize
