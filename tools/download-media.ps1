# 从 Wikimedia Commons 搜索并下载官方天文图片 + 讲解视频
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36'
$imgDir = 'F:\天文科普\client\public\assets\images\official'
$vidDir = 'F:\天文科普\client\public\assets\videos\explain'
New-Item -ItemType Directory -Path $imgDir,$vidDir -Force | Out-Null

function Search-Commons($q, $limit=6) {
    $args = @('--get','https://commons.wikimedia.org/w/api.php',
        '--data-urlencode','action=query','--data-urlencode','format=json',
        '--data-urlencode','generator=search','--data-urlencode',"gsrsearch=$q",
        '--data-urlencode','gsrnamespace=6','--data-urlencode',"gsrlimit=$limit",
        '--data-urlencode','prop=imageinfo','--data-urlencode','iiprop=url|size|mime',
        '--data-urlencode','iiurlwidth=1600','-H',"User-Agent: $ua",'--max-time','60')
    $json = & curl.exe -s @args | ConvertFrom-Json
    return $json
}

function Get-Pages($json) {
    if (-not $json.query.pages) { return @() }
    $out = @()
    foreach ($p in $json.query.pages.PSObject.Properties.Value) {
        $ii = $p.imageinfo[0]
        $out += [pscustomobject]@{
            title = $p.title; mime = $ii.mime; w = $ii.width; h = $ii.height
            mb = [math]::Round($ii.size/1MB,2); thumb = $ii.thumburl; url = $ii.url
        }
    }
    return $out
}

# ============ 官方图片 ============
$imgs = @{
    'butterfly_nebula'   = 'Butterfly Nebula NGC 6302 Hubble'
    'cats_eye_nebula'    = 'Cat Eye Nebula Hubble'
    'cartwheel_galaxy'   = 'Cartwheel Galaxy James Webb'
    'southern_ring'      = 'Southern Ring Nebula James Webb NIRCam'
    'stephans_quintet'   = 'Stephans Quintet James Webb'
    'tarantula_nebula'   = 'Tarantula Nebula Hubble'
    'helix_nebula'       = 'Helix Nebula Hubble'
    'veil_nebula'        = 'Veil Nebula Hubble'
    'trifid_nebula'      = 'Trifid Nebula Hubble'
    'webb_pillars'       = 'Pillars of Creation James Webb NIRCam'
}
foreach ($name in $imgs.Keys) {
    $q = $imgs[$name]
    $json = Search-Commons $q
    $pages = Get-Pages $json
    $img = $pages | Where-Object { $_.mime -in @('image/jpeg','image/png') -and $_.w -ge 800 } | Select-Object -First 1
    if ($img) {
        $dest = Join-Path $imgDir "$name.jpg"
        & curl.exe -sL -A $ua -o $dest --retry 3 --max-time 300 $img.thumb
        if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 20000) {
            "图片 OK: $name.jpg ($(($img.w))x$($img.h))"
        } else {
            "图片失败: $name  (来源: $($img.title))"
            Remove-Item $dest -Force -ErrorAction SilentlyContinue
        }
    } else {
        "图片未找到: $name"
    }
    Start-Sleep -Milliseconds 300
}

# ============ 讲解视频 ============
$vids = @{
    'explain_eagle'    = 'Hubble Inside The Image Eagle Nebula'
    'explain_crab'     = 'Hubble Inside The Image Crab Nebula'
    'explain_dumbbell' = 'Hubble 34th Anniversary Little Dumbbell Nebula wide'
}
foreach ($name in $vids.Keys) {
    $q = $vids[$name]
    $json = Search-Commons $q
    $pages = Get-Pages $json
    $v = $pages | Where-Object { $_.mime -like 'video/webm*' -and $_.mb -lt 40 } | Select-Object -First 1
    if ($v) {
        $dest = Join-Path $vidDir "$name.webm"
        & curl.exe -sL -A $ua -o $dest --retry 5 --max-time 900 $v.url
        if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 100000) {
            "视频 OK: $name.webm ($($v.mb) MB)"
        } else {
            "视频失败: $name"
            Remove-Item $dest -Force -ErrorAction SilentlyContinue
        }
    } else {
        "视频未找到: $name"
    }
    Start-Sleep -Milliseconds 300
}
