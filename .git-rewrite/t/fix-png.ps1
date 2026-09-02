Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PWD "public\pwa-512x512.png"
$tempPath = Join-Path $PWD "public\temp-icon.png"

Write-Host "Opening image: $sourcePath"
try {
    $img = [System.Drawing.Image]::FromFile($sourcePath)
    Write-Host "Saving as strict PNG format..."
    $img.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    
    # Overwrite the original
    Move-Item -Path $tempPath -Destination $sourcePath -Force
    Write-Host "✅ Success! Image successfully converted to strict PNG using Windows PowerShell."
    Write-Host ""
    Write-Host "Now run:"
    Write-Host 'git add public/pwa-512x512.png'
    Write-Host 'git commit -m "fix: enforce strict PNG format for tauri icon"'
    Write-Host 'git push origin main'
} catch {
    Write-Host "❌ Error: $_"
}
