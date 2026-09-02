# ==============================================================================
# Programmatic Windows Code Signing & Trust Generator
# App: "حاج أيوب أمين" (Hajj Ayoub Amine)
# ==============================================================================

param(
    [string]$CertPassword = "HajjAyoubAmine2026!",
    [string]$TargetExePath = ""
)

Write-Host "=== 1. GENERATING PROGRAMMATIC CODE SIGNING CERTIFICATE ===" -ForegroundColor Cyan

$certName = "CN=Hajj Ayoub Amine, O=Hajj Ayoub Amine Quran Foundation, C=DZ"
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $certName `
    -KeyUsage DigitalSignature `
    -FriendlyName "Hajj Ayoub Amine Quran App" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
    -NotAfter (Get-Date).AddYears(10) `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -HashAlgorithm SHA256

Write-Host "Certificate generated successfully with Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# 2. Export PFX and CER
$outputDir = Join-Path $PSScriptRoot "..\certificates"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$pfxPath = Join-Path $outputDir "hajj-ayoub-amine.pfx"
$cerPath = Join-Path $outputDir "hajj-ayoub-amine.cer"
$securePassword = ConvertTo-SecureString -String $CertPassword -Force -AsPlainText

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

Write-Host "Exported PFX: $pfxPath" -ForegroundColor Yellow
Write-Host "Exported Public CER: $cerPath" -ForegroundColor Yellow

# 3. Automatically trust locally for the developer / tester machine
Write-Host "`n=== 2. INSTALLING TO LOCAL TRUSTED PUBLISHERS (Bypasses SmartScreen) ===" -ForegroundColor Cyan
try {
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\LocalMachine\Root" -ErrorAction SilentlyContinue | Out-Null
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" -ErrorAction SilentlyContinue | Out-Null
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" -ErrorAction SilentlyContinue | Out-Null
    Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Certificate installed into Trusted Root & Trusted Publishers stores!" -ForegroundColor Green
} catch {
    Write-Host "Note: Machine-wide root install requires Administrator privilege. CurrentUser store updated." -ForegroundColor Yellow
}

# 4. Sign target binary if provided
if ($TargetExePath -and (Test-Path $TargetExePath)) {
    Write-Host "`n=== 3. SIGNING BINARY: $TargetExePath ===" -ForegroundColor Cyan
    Set-AuthenticodeSignature `
        -FilePath $TargetExePath `
        -Certificate $cert `
        -TimestampServer "http://timestamp.digicert.com" `
        -HashAlgorithm SHA256

    $sig = Get-AuthenticodeSignature -FilePath $TargetExePath
    Write-Host "Signature Status: $($sig.Status) ($($sig.StatusMessage))" -ForegroundColor Green
}

Write-Host "`n=== DONE: Binary and Certificate are ready ===" -ForegroundColor Green
