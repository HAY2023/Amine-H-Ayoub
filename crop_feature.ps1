Add-Type -AssemblyName System.Drawing

$outputDir = "h:\learn-quran-kids-1\google-play-assets"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force }

$brainDir = Join-Path $env:USERPROFILE ".gemini\antigravity-ide\brain\06b57b84-d857-4e3e-b7cc-262bfc49ee75"

# 2. Feature Graphic (1024x500)
$featureSource = Join-Path $brainDir "feature_graphic_final_1788707749140.jpg"
$featureDest = "$outputDir\feature-graphic-1024x500.png"

Write-Host "Reading from: $featureSource"
$srcImg = [System.Drawing.Image]::FromFile($featureSource)
Write-Host "Feature source size: $($srcImg.Width)x$($srcImg.Height)"

# Crop the top banner (top third of the image)
$cropHeight = [Math]::Floor($srcImg.Height / 3)
$cropRect = New-Object System.Drawing.Rectangle(0, 0, $srcImg.Width, $cropHeight)
$cropped = ([System.Drawing.Bitmap]$srcImg).Clone($cropRect, $srcImg.PixelFormat)

# Resize to exactly 1024x500
$resized = New-Object System.Drawing.Bitmap(1024, 500)
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.DrawImage($cropped, 0, 0, 1024, 500)
$graphics.Dispose()

$resized.Save($featureDest, [System.Drawing.Imaging.ImageFormat]::Png)
$resized.Dispose()
$cropped.Dispose()
$srcImg.Dispose()
Write-Host "✅ Feature Graphic (1024x500) created successfully"
