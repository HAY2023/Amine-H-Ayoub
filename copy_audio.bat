@echo off
chcp 65001 > nul
echo جاري إنشاء مجلد الأصوات إن لم يكن موجوداً...
if not exist "public\audio\surahs" mkdir "public\audio\surahs"

echo جاري نسخ الملفات وإعادة تسميتها...
for %%F in ("h:\حاج أمين\*.mp3") do (
    for /f "tokens=1" %%N in ("%%~nxF") do (
        echo نسخ %%~nxF إلى %%N.mp3
        copy /y "%%F" "public\audio\surahs\%%N.mp3" > nul
    )
)

echo تم نسخ الملفات بنجاح!
pause
