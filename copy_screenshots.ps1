$outputDir = "h:\learn-quran-kids-1\google-play-assets\screenshots"
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force }

# Resolve path using wildcard to avoid Arabic encoding issues in PowerShell string literals
$brainPath = Resolve-Path "C:\Users\*\.gemini\antigravity-ide\brain\06b57b84-d857-4e3e-b7cc-262bfc49ee75" | Select-Object -ExpandProperty Path

$screenshots = @(
    @{ src = "$brainPath\main_page_surahs_1788706612657.png"; name = "screenshot-01-main-page.png" },
    @{ src = "$brainPath\games_page_1788707331498.png"; name = "screenshot-02-games.png" },
    @{ src = "$brainPath\shop_page_1788707364061.png"; name = "screenshot-03-shop.png" },
    @{ src = "$brainPath\settings_page_1788707472720.png"; name = "screenshot-04-settings.png" },
    @{ src = "$brainPath\parent_page_1788707597535.png"; name = "screenshot-05-parent-dashboard.png" }
)

foreach ($ss in $screenshots) {
    if (Test-Path $ss.src) {
        Copy-Item $ss.src "$outputDir\$($ss.name)" -Force
        Write-Host "✅ Copied $($ss.name)"
    } else {
        Write-Host "❌ NOT FOUND: $($ss.src)"
    }
}
