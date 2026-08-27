Add-Type -AssemblyName System.Drawing

$srcFile = Join-Path $PWD "public\my-photo.png"

if (-not (Test-Path $srcFile)) {
    Write-Host "File not found: $srcFile"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($srcFile)
$w = $img.Width
$h = $img.Height

Write-Host "Source image loaded: Width=$w, Height=$h"

# We want a nice square crop or square canvas for app icon.
# If the image is portrait (h > w), we can take a square region focused on upper-middle (face + quran).
# Let's calculate crop area:
$cropSize = [Math]::Min($w, $h)
# Focus slightly on top/center (offset Y = 0 to capture head and top portion)
$cropX = [Math]::Max(0, [int](($w - $cropSize) / 2))
$cropY = 0
if ($h > $w) {
    # start from top
    $cropY = 0
}

Write-Host "Crop rectangle: X=$cropX, Y=$cropY, Size=$cropSize"

function Create-ResizedIcon($targetPath, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::White)

    $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $graphics.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    Write-Host "Saved icon: $targetPath ($size x $size)"
}

Create-ResizedIcon (Join-Path $PWD "public\pwa-512x512.png") 512
Create-ResizedIcon (Join-Path $PWD "public\pwa-192x192.png") 192
Create-ResizedIcon (Join-Path $PWD "public\favicon.png") 64

# Also Tauri icons
$tauriIcons = Join-Path $PWD "src-tauri\icons"
if (Test-Path $tauriIcons) {
    Create-ResizedIcon (Join-Path $tauriIcons "app-icon.png") 1024
    Create-ResizedIcon (Join-Path $tauriIcons "32x32.png") 32
    Create-ResizedIcon (Join-Path $tauriIcons "128x128.png") 128
    Create-ResizedIcon (Join-Path $tauriIcons "128x128@2x.png") 256
    Create-ResizedIcon (Join-Path $tauriIcons "icon.png") 512
    Create-ResizedIcon (Join-Path $tauriIcons "Square30x30Logo.png") 30
    Create-ResizedIcon (Join-Path $tauriIcons "Square44x44Logo.png") 44
    Create-ResizedIcon (Join-Path $tauriIcons "Square71x71Logo.png") 71
    Create-ResizedIcon (Join-Path $tauriIcons "Square89x89Logo.png") 89
    Create-ResizedIcon (Join-Path $tauriIcons "Square107x107Logo.png") 107
    Create-ResizedIcon (Join-Path $tauriIcons "Square142x142Logo.png") 142
    Create-ResizedIcon (Join-Path $tauriIcons "Square150x150Logo.png") 150
    Create-ResizedIcon (Join-Path $tauriIcons "Square284x284Logo.png") 284
    Create-ResizedIcon (Join-Path $tauriIcons "Square310x310Logo.png") 310
    Create-ResizedIcon (Join-Path $tauriIcons "StoreLogo.png") 50
}

$img.Dispose()
Write-Host "All icons updated successfully with the real image!"
