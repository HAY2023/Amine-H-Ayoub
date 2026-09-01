@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title رفع التلاوات - امين حاج ايوب

:: ===== ملف واحد - يعمل مباشرة بدون تثبيت اي شيء =====
set "PS=%TEMP%\upload_talawa_tmp.ps1"
set "TOKEN=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"
set "REPO=hammoualiyoucef20/quran-audio"
set "DIR=H:\التلاوة التعليمية - أمين حاج أيوب mp3"
set "UP_DIR=%DIR%"
set "FIRST=114"
set "LAST=36"
if not "%~1"=="" set "FIRST=%~1"
if not "%~2"=="" set "LAST=%~2"

:: ===== توليد سكربت العمل المؤقت (داخلي - لن يتبقى شيء) =====
>  "%PS%" echo $ErrorActionPreference = 'Continue'
>> "%PS%" echo $token = '%TOKEN%'
>> "%PS%" echo $repo = '%REPO%'
>> "%PS%" echo $dir = $env:UP_DIR
>> "%PS%" echo $first = %FIRST%
>> "%PS%" echo $last = %LAST%
>> "%PS%" echo $status = 'upload-log.txt'
>> "%PS%" echo $base = 'https://huggingface.co/api/datasets/' + $repo + '/resolve/main'
>> "%PS%" echo $batchUrl = 'https://huggingface.co/datasets/' + $repo + '.git/info/lfs/objects/batch'
>> "%PS%" echo $commitUrl = 'https://huggingface.co/api/datasets/' + $repo + '/commit/main'
>> "%PS%" echo $hAuth = @{ Authorization = 'Bearer ' + $token }
>> "%PS%" echo $uploaded = 0
>> "%PS%" echo $skipped = 0
>> "%PS%" echo $missing = 0
>> "%PS%" echo $failed = 0
>> "%PS%" echo function W($s) { [IO.File]::AppendAllText($status, $s + [Environment]::NewLine, [Text.Encoding]::UTF8) }
>> "%PS%" echo W ('==== start: ' + [DateTime]::Now.ToString('yyyy-MM-dd HH:mm'))
>> "%PS%" echo Write-Host 'Jary al-raf3 min surah 114 ila 36...' -ForegroundColor Cyan
>> "%PS%" echo if (-not (Test-Path -LiteralPath $dir)) { Write-Host ('Mojield ghair mawjoud: ' + $dir) -ForegroundColor Red; Read-Host 'Enter li-lkhruj'; exit 1 }
>> "%PS%" echo for ($n = $first; $n -ge $last; $n--) {
>> "%PS%" echo   $localNum = 116 - $n
>> "%PS%" echo   $file = $null
>> "%PS%" echo   $c1 = Get-ChildItem -Path $dir -Filter ('' + $localNum + '.mp3') -File -ErrorAction SilentlyContinue
>> "%PS%" echo   if ($c1.Count -gt 0) { $file = $c1[0] }
>> "%PS%" echo   if (-not $file) { $c2 = Get-ChildItem -Path $dir -Filter ('' + $localNum + ' *.mp3') -File -ErrorAction SilentlyContinue; if ($c2.Count -gt 0) { $file = $c2[0] } }
>> "%PS%" echo   if (-not $file) { W ('[' + $n + '] MISSING locally - skip'); Write-Host ('[' + $n + '] MISSING local') -ForegroundColor DarkGray; $missing = $missing + 1; continue }
>> "%PS%" echo   $exists = $false
>> "%PS%" echo   try { $r = Invoke-WebRequest -Uri ($base + '/' + $n + '.mp3') -Method Head -Headers $hAuth -UseBasicParsing -TimeoutSec 15; if ($r.StatusCode -eq 200) { $exists = $true } } catch { $exists = $false }
>> "%PS%" echo   if ($exists) { W ('[' + $n + '] SKIP - already on server'); Write-Host ('[' + $n + '] SKIP on server') -ForegroundColor Green; $skipped = $skipped + 1; continue }
>> "%PS%" echo   Write-Host ('[' + $n + '] Uploading: ' + $file.Name + ' ...') -ForegroundColor Yellow
>> "%PS%" echo   if ($resp.objects[0].actions) {
>> "%PS%" echo     $href = $resp.objects[0].actions.upload.href
>> "%PS%" echo     try { $null = Invoke-WebRequest -Uri $href -Method Put -InFile $file.FullName -UseBasicParsing -TimeoutSec 300 } catch { Write-Host ('[' + $n + '] FAIL put: ' + $_.Exception.Message) -ForegroundColor Red }
>> "%PS%" echo     if ($resp.objects[0].actions.verify) {
>> "%PS%" echo       $v = ConvertTo-Json -InputObject @{ oid = $hash; size = $size }
>> "%PS%" echo       try { $null = Invoke-RestMethod -Uri $resp.objects[0].actions.verify.href -Method Post -Headers $hAuth -ContentType 'application/vnd.git-lfs+json' -Body $v -TimeoutSec 60 } catch { }
>> "%PS%" echo     }
>> "%PS%" echo   }
>> "%PS%" echo   $line1 = '{"key": "header", "value": {"summary": "upload talawat", "description": ""}}'
>> "%PS%" echo   $line2 = '{"key": "lfsFile", "value": {"path": "' + $n + '.mp3", "algo": "sha256", "oid": "' + $hash + '", "size": ' + $size + '}}'
>> "%PS%" echo   $ndjs = $line1 + [char]10 + $line2 + [char]10
>> "%PS%" echo   try { $null = Invoke-RestMethod -Uri $commitUrl -Method Post -Headers $hAuth -ContentType 'application/x-ndjson' -Body $ndjs -TimeoutSec 120; W ('[' + $n + '] OK'); Write-Host ('[' + $n + '] DONE: ' + $file.Name) -ForegroundColor Green; $uploaded = $uploaded + 1 } catch { W ('[' + $n + '] FAIL commit'); Write-Host ('[' + $n + '] FAIL commit: ' + $_.Exception.Message) -ForegroundColor Red; $failed = $failed + 1 }
>> "%PS%" echo }
>> "%PS%" echo W ('==== end: upload=' + $uploaded + ' skip=' + $skipped + ' missing=' + $missing + ' fail=' + $failed)
>> "%PS%" echo Write-Host '==============' -ForegroundColor Cyan
>> "%PS%" echo Write-Host ('Uploaded: ' + $uploaded + '  -  Already: ' + $skipped + '  -  Missing: ' + $missing + '  -  Failed: ' + $failed) -ForegroundColor Yellow
>> "%PS%" echo Write-Host 'Sajjil kamel fi: upload-log.txt' -ForegroundColor Cyan
>> "%PS%" echo Read-Host 'Enter li-lkhruj'

:: ===== تشغيل ثم تنظيف =====
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS%"
set "RC=%ERRORLEVEL%"
del "%PS%" >nul 2>&1
exit /b %RC%
>> "%PS%" echo   $fh = Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256
>> "%PS%" echo   $hash = ($fh.Hash).ToLowerInvariant()
>> "%PS%" echo   $size = $file.Length
>> "%PS%" echo   $obj = [ordered]@{ oid = $hash; size = $size }
>> "%PS%" echo   $payload = [ordered]@{ operation = 'upload'; transfers = @('basic'); objects = @($obj); hash_algo = 'sha256'; ref = @{ name = 'main' } }
>> "%PS%" echo   $json = ConvertTo-Json -InputObject $payload -Depth 6
>> "%PS%" echo   try { $resp = Invoke-RestMethod -Uri $batchUrl -Method Post -Headers $hAuth -ContentType 'application/vnd.git-lfs+json' -Body $json -TimeoutSec 60 } catch { W ('[' + $n + '] FAIL batch'); Write-Host ('[' + $n + '] FAIL batch: ' + $_.Exception.Message) -ForegroundColor Red; $failed = $failed + 1; continue }