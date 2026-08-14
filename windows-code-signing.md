# دليل توثيق وتوقيع كود تطبيق "حاج أيوب أمين" لنظام ويندوز (Windows Code Signing Guide)

> [!IMPORTANT]
> **إجراء يتطلب تدخلك**: حل تحذيرات الفيروسات وفحص الذكاء لـ Windows (SmartScreen / Windows Defender) يتطلب الحصول على شهادة توقيع كود راسية (Code Signing Certificate PFX / EV) باسمك أو باسم مؤسستك. لا يمكن للبرمجيات توقيع التطبيقات ذاتياً بدون شهادة معتمدة من جهة إصدار شهادات (CA).

---

## 1. سبب ظهور تحذيرات الأنتيفيروس (SmartScreen Warning)
عند تشغيل ملف تثبيت `.exe` أو `.msi` لم يُمضَ بشهادة توقيع رقمية معتمدة:
1. **Windows SmartScreen** يعرض شاشة زرقاء "Windows protected your PC / منع Windows تشغيل هذا التطبيق".
2. **برامج الأنتيفيروس** قد تعتبر الملف غير معروف (Unrecognized Binary) وتُصدر تنبيهاً كاذباً (False Positive).
3. **تنويه هائل بشأن UPX**: تم التأكد من أن مشروع "حاج أيوب أمين" **لا يستخدم مضغوطات الأسمبلي (Packers) مثل UPX**، حيث أن استخدام UPX يزيد بشكل كبير من كشف الأنتيفيروس الكاذب.

---

## 2. خطوات الحصول على شهادة توقيع الرقمي (Code Signing Certificate)

يمكنك شراء الشهادة من إحدى الجهات التالية المعترف بها من Microsoft:
- **DigiCert** (موصى بها لـ EV Code Signing)
- **Sectigo / Comodo**
- **GlobalSign**

توجد نوعان من الشهادات:
1. **Standard Code Signing (PFX File)**: ملف بحجم صغير بكلمة سر، يبني السمعة تدريجياً مع زيادة التنزيلات.
2. **EV Code Signing (Hardware Token / Cloud Key)**: يزيل تحذير SmartScreen فوراً من أول تنزيل (Instant SmartScreen Reputation).

---

## 3. كيفية تطبيق الشهادة على مشروع Tauri v2

### أ) التوقيع المحلي عبر Tauri CLI (`tauri.conf.json`)

في حال حصولك على شهادة PFX محلياً:

1. ضع شهادة `certificate.pfx` في مجلد آمن خارجي أو في جذر مشروع Tauri.
2. أضف الإعدادات التالية إلى `src-tauri/tauri.conf.json` تحت قسم `bundle -> windows`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

3. شغّل أمر البناء وتمرير كلمة سر الشهادة عبر متغيرات البيئة:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY="c:\path\to\certificate.pfx"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-certificate-password"
npm run tauri build
```

---

### ب) التوقيع اليدوي باستخدام أدوات Microsoft (`signtool.exe`)

إذا كان لديك ملف البناء المجمع جاهزاً `Hajj-Ayoub-Amine_1.0.0_x64-setup.exe`:

```powershell
signtool sign /f "C:\path\to\your_certificate.pfx" /p "YOUR_PASSWORD" /tr "http://timestamp.digicert.com" /td sha256 /fd sha256 "src-tauri\target\release\bundle\msi\حاج أيوب أمين_1.0.0_x64_ar-SA.msi"
```

للتحقق من التوقيع بعد العملية:
```powershell
signtool verify /pa /v "src-tauri\target\release\bundle\msi\حاج أيوب أمين_1.0.0_x64_ar-SA.msi"
```

---

### ج) التوقيع التلقائي عبر خطة GitHub Actions (`publish-release.yml`)

تضمين الشهادة في سير العمل التلقائي (CI/CD):

1. قم بتحويل ملف الشهادة `.pfx` إلى Base64:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your_certificate.pfx")) | Set-Clipboard
```

2. الذهاب إلى GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**:
   - أضف `WINDOWS_CERTIFICATE`: يحتوي نص Base64 للشهادة.
   - أضف `WINDOWS_CERT_PASSWORD`: كلمة مرور الشهادة.

---

## 4. قائمة التحقق النهائية قبل الإطلاق

- [x] عدم إدراج أي أدوات تجميع أو حزم مثل UPX في بناء المشروع.
- [ ] الحصول على شهادة Code Signing (PFX أو EV).
- [ ] ربط الشهادة بمتغيرات بيئة بناء Tauri أو GitHub Secrets.
- [ ] اختبار التثبيت على جهاز ويندوز نظيف والتأكد من اختفاء شاشة التنبيه الأزرق.
