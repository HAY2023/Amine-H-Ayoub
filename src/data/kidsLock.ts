/**
 * قفل ركن الأطفال — أمان صارم يعتمد على رمز مرور الوالدين الإلزامي (Mandatory PIN).
 * لا يمكن تفعيل وضع الأطفال إطلاقاً ما لم يقم ولي الأمر بتعيين رمز مرور مخصص غير افتراضي.
 */
const PIN_KEY = "mushaf:kidsPin";
const MODE_KEY = "mushaf:kidsMode";
const APP_MODE_KEY = "mushaf:appMode:v1";

/**
 * استرجاع رمز ولي الأمر المخصص.
 * يعود بـ null إذا لم يتم تعيين رمز مخصص مسبقاً (تم إلغاء الرمز الافتراضي تماماً).
 */
export const getKidsPin = (): string | null => {
  try {
    const pin = localStorage.getItem(PIN_KEY);
    return pin && pin.length >= 4 ? pin : null;
  } catch {
    return null;
  }
};

export const setKidsPin = (p: string) => {
  try {
    if (p && p.length >= 4) {
      localStorage.setItem(PIN_KEY, p);
    }
  } catch {
    /* ignore */
  }
};

export const removeKidsPin = () => {
  try {
    localStorage.removeItem(PIN_KEY);
    // إلغاء وضع الأطفال أيضاً عند إزالة الرمز
    setKidsLocked(false);
  } catch {
    /* ignore */
  }
};

/**
 * التحقق من وجود رمز مخصص تم تعيينه من قبل الوالدين.
 */
export const hasCustomKidsPin = (): boolean => {
  return getKidsPin() !== null;
};

export const hasKidsPin = hasCustomKidsPin;

/**
 * التحقق من صحة الرمز المدخل مقارنة برمز الوالدين.
 */
export const verifyKidsPin = (inputPin: string): boolean => {
  const currentPin = getKidsPin();
  if (!currentPin) return false;
  return inputPin.trim() === currentPin;
};

export const isKidsMode = (): boolean => {
  try {
    return localStorage.getItem(MODE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * محاولة تفعيل أو تعطيل وضع الأطفال.
 * يمنع التفعيل تماماً إذا لم يكن هناك رمز PIN مخصص.
 */
export const setKidsLocked = (on: boolean): boolean => {
  if (on && !hasKidsPin()) {
    console.warn("Blocking Kids Mode activation: No parent PIN has been configured!");
    return false;
  }

  try {
    localStorage.setItem(MODE_KEY, on ? "1" : "0");
    localStorage.setItem(APP_MODE_KEY, on ? "kids" : "parent");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mushaf:kidsmode"));
    window.dispatchEvent(new Event("mushaf:appmode"));
  }
  return true;
};

/**
 * فحص دعم بصمة الجهاز أو قفل الشاشة
 */
export async function isDeviceAuthAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * طلب فتح القفل عبر مصادقة الجهاز / البصمة
 */
export async function requestDeviceUnlock(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.credentials) return false;
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "preferred",
        rpId: window.location.hostname || "localhost",
        allowCredentials: [],
      },
    });
    return !!credential;
  } catch (e) {
    console.log("Device credential verification fallback:", e);
    return false;
  }
}
