# ============================================================
#  سكربت رفع التلاوات إلى سيرفر HuggingFace
#  المسار المحلي: H:\التلاوة التعليمية - أمين حاج أيوب mp3
#  الترتيب: من سورة الناس (114) نزولاً حتى يس (36) — الفاتحة (1) موجودة مسبقاً
#  المكرر: إذا كان الصوت موجوداً في السيرفر يُنقل إلى مجلد "_مكرر" (لا يُرفع مرتين)
#  السجل: كل الأرقام تُكتب في ملف "حالة-الرفع.txt" بجانب السكربت
# ============================================================
param(
  [string]$LocalDir = "H:\التلاوة التعليمية - أمين حاج أيوب mp3",
  [string]$Repo = "hammoualiyoucef20/quran-audio",
  [int]$First = 114,
  [int]$Last = 36,
  [switch]$DeleteDuplicate   # مع هذا الخيار يحذف الملف المحلي المكرر بدل نقله لمجلد _مكرر
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Base = "https://huggingface.co/datasets/$Repo/resolve/main"
$StatusFile = Join-Path $PSScriptRoot "حالة-الرفع.txt"
$DupDir = Join-Path $LocalDir "_مكرر"

"==== بدء الرفع: $(Get-Date -Format 'yyyy-MM-dd HH:mm') ====" | Out-File $StatusFile -Encoding UTF8

# التحقق من التوكن
$Token = $env:HF_TOKEN
if (-not $Token) {
  "خطأ: متغير HF_TOKEN غير مضبوط. نفّذ:  setx HF_TOKEN \"hf_...\"  ثم أعد فتح النافذة" | Tee-Object -FilePath $StatusFile -Append
  Read-Host "اضغط Enter للخروج"; exit 1
}

# التحقق من أداة huggingface-cli (الطريقة الرسمية للرفع)
$cli = Get-Command huggingface-cli -ErrorAction SilentlyContinue
if (-not $cli) {
  "خطأ: أداة huggingface-cli غير مثبتة. ثبّتها بالأوامر:" | Tee-Object -FilePath $StatusFile -Append
  "   pip install -U huggingface_hub" | Tee-Object -FilePath $StatusFile -Append
  "   huggingface-cli login   (الصق التوكن hf_...)" | Tee-Object -FilePath $StatusFile -Append
  Read-Host "اضغط Enter للخروج"; exit 1
}

if (-not (Test-Path $LocalDir)) { "خطأ: المسار غير موجود: $LocalDir" | Tee-Object -FilePath $StatusFile -Append; Read-Host "Enter"; exit 1 }

$uploaded = 0; $skipped = 0; $missing = 0; $failed = 0

# الترتيب المطلوب: من 114 نزولاً حتى 36
for ($n = $First; $n -ge $Last; $n--) {
  # 1) إيجاد الملف المحلي (114.mp3 أو يبدأ بـ 114)
  $file = Get-ChildItem -Path $LocalDir -Filter "$n.mp3" -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $file) { $file = Get-ChildItem -Path $LocalDir -Filter "$n *.mp3" -File -ErrorAction SilentlyContinue | Select-Object -First 1 }
  if (-not $file) {
    "[$n] ✗ غير موجود في الجهاز — تخطٍ" | Tee-Object -FilePath $StatusFile -Append
    $missing++; continue
  }

  # 2) هل الصوت موجود مسبقاً في السيرفر؟
  $exists = $false
  try {
    $r = Invoke-WebRequest -Uri "$Base/$n.mp3" -Method Head -UseBasicParsing -TimeoutSec 20
    if ($r.StatusCode -eq 200) { $exists = $true }
  } catch { $exists = $false }

  if ($exists) {
    "[$n] ✔ موجود مسبقاً في السيرفر — تخطي الرفع" | Tee-Object -FilePath $StatusFile -Append
    if (-not (Test-Path $DupDir)) { New-Item -ItemType Directory -Path $DupDir | Out-Null }
    if ($DeleteDuplicate) { Remove-Item $file.FullName -Force; "[$n] 🗑 حُذف المكرر من الجهاز" | Tee-Object -FilePath $StatusFile -Append }
    else { Move-Item $file.FullName (Join-Path $DupDir $file.Name) -Force; "[$n] 📦 نُقل المكرر إلى مجلد _مكرر" | Tee-Object -FilePath $StatusFile -Append }
    $skipped++; continue
  }

  # 3) الرفع عبر huggingface-cli
  "[$n] ⏫ جارٍ الرفع: $($file.Name) ($([math]::Round($file.Length/1MB,1)) MB)..." | Tee-Object -FilePath $StatusFile -Append
  & huggingface-cli upload $Repo $file.FullName "$n.mp3" --repo-type dataset 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    "[$n] ✅ تم الرفع بنجاح" | Tee-Object -FilePath $StatusFile -Append
    $uploaded++
  } else {
    # إعادة محاولة واحدة
    Start-Sleep -Seconds 5
    & huggingface-cli upload $Repo $file.FullName "$n.mp3" --repo-type dataset 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { "[$n] ✅ تم الرفع (محاولة ثانية)" | Tee-Object -FilePath $StatusFile -Append; $uploaded++ }
    else { "[$n] ❌ فشل الرفع — أعد المحاولة لاحقاً" | Tee-Object -FilePath $StatusFile -Append; $failed++ }
  }
}

"==== انتهى: رُفع $uploaded | موجود مسبقاً $skipped | ناقص بالجهاز $missing | فشل $failed ====" | Tee-Object -FilePath $StatusFile -Append
"الأرقام الناقصة في السيرفر معروضة في التطبيق: أدمن الألعاب ← حالة التلاوات" | Tee-Object -FilePath $StatusFile -Append
Read-Host "اضغط Enter للخروج"
