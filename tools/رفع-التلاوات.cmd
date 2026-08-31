@echo off
chcp 65001 >nul
title رفع التلاوات — أمين حاج أيوب
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0upload-talawa.ps1" %*
