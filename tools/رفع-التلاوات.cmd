@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title رفع التلاوات — أمين حاج أيوب

:: ===== ملف واحد — يعمل مباشرة بدون أي تثبيتات =====
set "HF_TOKEN=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"
set "REPO=hammoualiyoucef20/quran-audio"
set "DIR=H:\التلاوة التعليمية - أمين حاج أيوب mp3"
set "BASE=https://huggingface.co/api/datasets/%REPO%/upload/main"
set "HEAD=https://huggingface.co/api/datasets/%REPO%/resolve/main"
set "STATUS=حالة-الرفع.txt"

cd /d "%~dp0"

echo ==== بدء الرفع: %DATE% %TIME% ==== > "%STATUS%"

:: التحقق من توفر curl
where curl >nul 2>nul
if errorlevel 1 (
  echo [خطأ] curl غير متوفر على هذا النظام.

  pause
  exit /b 1
)

:: التحقق من المجلد
if not exist "%DIR%" (
  echo [خطأ] المجلد غير موجود: %DIR%
  echo [خطأ] المجلد غير موجود: %DIR% >> "%STATUS%"
  pause
  exit /b 1
)

set /a uploaded=0
set /a skipped=0
set /a missing=0
set /a failed=0

echo جاري الرفع من سورة الناس (114) حتى يس (36)...
echo.

:: الحلقة الرئيسية — من 114 نزولاً حتى 36
for /l %%n in (114,-1,36) do (
  set /a sur=%%n
  set /a localNum=116-%%n
  set "fpath=%DIR%\!localNum!.mp3"

  :: 1) هل الملف موجود على الجهاز؟
  if not exist "!fpath!" (
    echo [!sur!] ناقص بالجهاز — تخطي
    echo [!sur!] ✗ غير موجود في الجهاز — تخطي >> "%STATUS%"
    set /a missing+=1
  ) else (

    :: 2) هل الصوت موجود مسبقاً في السيرفر؟
    curl -s -o nul -w "%%{http_code}" -I -H "Authorization: Bearer %HF_TOKEN%" "%HEAD%/!sur!.mp3" | findstr /C:"200" >nul
    if not errorlevel 1 (
      echo [!sur!] موجود مسبقاً في السيرفر — تخطي
      echo [!sur!] ✔ موجود مسبقاً في السيرفر — تخطي الرفع >> "%STATUS%"
      set /a skipped+=1
    ) else (
      :: 3) الرفع إلى HuggingFace مباشرة
      echo [!sur!] جاري الرفع: [!localNum!.mp3]
      echo [!sur!] ⏫ جاري الرفع: [!localNum!.mp3] >> "%STATUS%"
      curl -s -X POST -H "Authorization: Bearer %HF_TOKEN%" --upload-file "!fpath!" "%BASE%?path=!sur!.mp3" -o nul
      if not errorlevel 1 (
        echo [!sur!] تم الرفع بنجاح — ✅
        echo [!sur!] ✅ تم الرفع بنجاح >> "%STATUS%"
        set /a uploaded+=1
      ) else (
        echo [!sur!] فشل الرفع — أعد المحاولة لاحقاً
        echo [!sur!] ❌ فشل الرفع — أعد المحاولة لاحقاً >> "%STATUS%"
        set /a failed+=1
      )
    )
  )
)

echo.
echo ============================================
echo انتهى الرفع
echo رفع: %uploaded%  -  موجود مسبقاً: %skipped%  -  ناقص: %missing%  -  فشل: %failed%
echo ============================================
echo ==== انتهى: رفع %uploaded% - موجود مسبقاً %skipped% - ناقص %missing% - فشل %failed% ==== >> "%STATUS%"
echo السجل الكامل في: "%STATUS%"
pause