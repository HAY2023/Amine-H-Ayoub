# سكربت رفع واستبدال التلاوات التعليمية على السيرفر السحابي
param(
    [string]$AudioDir = "H:\التلاوة التعليمية - أمين حاج أيوب mp3",
    [string]$Repo = "hammoualiyoucef20/quran-audio",
    [string]$Token = "REDACTED_HF_TOKEN"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Out = "حالة-الرفع.txt"

$SurahMap = @{
    'الفاتحة'=1; 'الناس'=2; 'الفلق'=3; 'الإخلاص'=4; 'المسد'=5; 'النصر'=6; 'الكافرون'=7;
    'الكوثر'=8; 'الماعون'=9; 'قريش'=10; 'الفيل'=11; 'الهمزة'=12; 'العصر'=13; 'التكاثر'=14;
    'القارعة'=15; 'العاديات'=16; 'الزلزلة'=17; 'البينة'=18; 'القدر'=19; 'العلق'=20;
    'التين'=21; 'الشرح'=22; 'الضحى'=23; 'الليل'=24; 'الشمس'=25; 'البلد'=26; 'الفجر'=27;
    'الغاشية'=28; 'الأعلى'=29; 'الطارق'=30; 'البروج'=31; 'الإنشقاق'=32; 'المطففين'=33;
    'الإنفطار'=34; 'التكوير'=35; 'عبس'=36; 'النازعات'=37; 'النبأ'=38
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   بدء رفع واستبدال التلاوات على السيرفر السحابي" -ForegroundColor Yellow
Write-Host "   المسار: $AudioDir" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $AudioDir)) {
    Write-Host "❌ المجلد غير موجود: $AudioDir" -ForegroundColor Red
    exit
}

$files = Get-ChildItem -LiteralPath $AudioDir -Filter '*.mp3' | Sort-Object { [int](([regex]::Match($_.Name, '^\d+')).Value) }
Write-Host "📁 تم العثور على $($files.Count) ملف صوتي في المجلد." -ForegroundColor Cyan

$Uploaded = 0; $Failed = 0; $Total = 0
"==== بدء الرفع والاستبدال: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ====" | Out-File $Out -Encoding UTF8

foreach ($file in $files) {
    $targetNum = $null
    $matchNum = [regex]::Match($file.Name, '^(\d+)')
    if ($matchNum.Success) {
        $num = [int]$matchNum.Groups[1].Value
        if ($num -ge 1 -and $num -le 38) { $targetNum = $num }
    }
    if (-not $targetNum) {
        foreach ($name in $SurahMap.Keys) {
            if ($file.Name -like "*$name*") { $targetNum = $SurahMap[$name]; break }
        }
    }
    if (-not $targetNum) { continue }

    $Total++
    Write-Host "[$targetNum.mp3] ⏫ جاري رفع واستبدال: $($file.Name)..." -ForegroundColor Yellow

    try {
        $resp = curl.exe -s -X POST -H "Authorization: Bearer $Token" -F "file=@$($file.FullName)" -F "path=$targetNum.mp3" "https://huggingface.co/api/datasets/$Repo/upload/main"
        $json = $resp | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($json -and $json.commit -and $json.commit.id) {
            Write-Host "[$targetNum.mp3] ✅ تم الاستبدال والرفع بنجاح!" -ForegroundColor Green
            "[$targetNum.mp3] ✅ تم الاستبدال بنجاح ($($file.Name))" | Tee-Object -FilePath $Out -Append
            $Uploaded++
        } else {
            Write-Host "[$targetNum.mp3] ❌ فشل الرفع: $resp" -ForegroundColor Red
            "[$targetNum.mp3] ❌ فشل: $resp" | Tee-Object -FilePath $Out -Append
            $Failed++
        }
    } catch {
        Write-Host "[$targetNum.mp3] ❌ خطأ: $($_.Exception.Message)" -ForegroundColor Red
        "[$targetNum.mp3] ❌ خطأ: $($_.Exception.Message)" | Tee-Object -FilePath $Out -Append
        $Failed++
    }
    Start-Sleep -Milliseconds 800
}

"`n==== النتيجة: تم رفع واستبدال $Uploaded من أصل $Total (فشل $Failed) ====" | Tee-Object -FilePath $Out -Append
Write-Host "`n✨ اكتملت العملية! رُفع واستُبدل $Uploaded ملف بنجاح." -ForegroundColor Green
