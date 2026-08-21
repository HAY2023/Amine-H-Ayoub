import { useState, useEffect } from "react";
import { Lock, Fingerprint, Calculator, KeyRound, AlertCircle, X, ShieldCheck } from "lucide-react";
import { verifyKidsPin, isDeviceAuthAvailable, requestDeviceUnlock, hasCustomKidsPin, setKidsPin } from "@/data/kidsLock";

interface Props {
  title?: string;
  /** عند true: لا يمكن إغلاق النافذة بدون كلمة المرور — بدون زر ❌ وبدون سؤال حسابي */
  strictMode?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ParentalGateModal({
  title = "منطقة الوالدين (حماية وضع الأطفال)",
  strictMode = false,
  onSuccess,
  onCancel,
}: Props) {
  const hasCustom = hasCustomKidsPin();
  // في الوضع الصارم: لا يُسمح بالسؤال الحسابي — فقط PIN
  const [mode, setMode] = useState<"pin" | "math" | "setup_pin">(hasCustom ? "pin" : "setup_pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  // Math challenge state (emergency fallback)
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [mathAnswer, setMathAnswer] = useState("");

  useEffect(() => {
    isDeviceAuthAvailable().then(setHasBiometrics).catch(() => setHasBiometrics(false));
    setNum1(Math.floor(Math.random() * 8) + 6);
    setNum2(Math.floor(Math.random() * 8) + 4);
  }, []);

  const handleKeyClick = (val: string) => {
    setError(false);
    setErrorMsg("");

    if (mode === "setup_pin") {
      if (setupStep === "enter") {
        if (val === "back") {
          setPin((p) => p.slice(0, -1));
          return;
        }
        if (pin.length < 4) {
          const next = pin + val;
          setPin(next);
          if (next.length === 4) {
            setTimeout(() => {
              setSetupStep("confirm");
            }, 150);
          }
        }
      } else {
        if (val === "back") {
          setConfirmPin((p) => p.slice(0, -1));
          return;
        }
        if (confirmPin.length < 4) {
          const next = confirmPin + val;
          setConfirmPin(next);
          if (next.length === 4) {
            if (next === pin) {
              setKidsPin(next);
              onSuccess();
            } else {
              setError(true);
              setErrorMsg("الرمزان غير متطابقين، حاول مجدداً");
              setConfirmPin("");
              setSetupStep("enter");
              setPin("");
            }
          }
        }
      }
      return;
    }

    // Verify mode
    if (val === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      const next = pin + val;
      setPin(next);
      if (next.length === 4) {
        if (verifyKidsPin(next)) {
          onSuccess();
        } else {
          setError(true);
          setErrorMsg("كلمة المرور غير صحيحة، حاول مرة أخرى");
          setTimeout(() => {
            setPin("");
          }, 350);
        }
      }
    }
  };

  const handleManualSubmit = () => {
    if (verifyKidsPin(pin)) {
      onSuccess();
    } else {
      setError(true);
      setErrorMsg("كلمة المرور غير صحيحة، حاول مرة أخرى");
      setPin("");
    }
  };

  const handleBiometricUnlock = async () => {
    setIsVerifyingBio(true);
    setError(false);
    try {
      const ok = await requestDeviceUnlock();
      if (ok) {
        onSuccess();
        return;
      }
    } finally {
      setIsVerifyingBio(false);
    }
  };

  const handleMathSubmit = () => {
    if (parseInt(mathAnswer, 10) === num1 * num2) {
      onSuccess();
    } else {
      setError(true);
      setErrorMsg("إجابة غير صحيحة، حاول مجدداً");
      setMathAnswer("");
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl p-6 text-center space-y-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* زر الإغلاق مخفي في الوضع الصارم — لا مخرج بدون كلمة المرور */}
        {!strictMode && (
          <button
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center ring-1 ring-amber-500/20 shadow-inner">
          {mode === "setup_pin" ? (
            <ShieldCheck className="w-7 h-7" />
          ) : mode === "pin" ? (
            <Lock className="w-7 h-7" />
          ) : (
            <Calculator className="w-7 h-7" />
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-lg text-foreground">
            {mode === "setup_pin" ? "إعداد كلمة مرور حماية وضع الأطفال" : title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "setup_pin"
              ? setupStep === "enter"
                ? "يجب تعيين كلمة مرور مخصصة من 4 أرقام قبل تفعيل وضع الأطفال"
                : "أعد إدخال كلمة المرور لتأكيدها"
              : mode === "pin"
              ? strictMode
                ? "لا يمكن الخروج بدون كلمة مرور الوالدين"
                : "أدخل كلمة مرور الوالدين للخروج من ركن الأطفال / إغلاق التطبيق"
              : "أجب عن السؤال الحسابي للتحقق من أنك ولي الأمر"}
          </p>
        </div>

        {mode === "setup_pin" ? (
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-3 py-2" dir="ltr">
              {[0, 1, 2, 3].map((i) => {
                const currentVal = setupStep === "enter" ? pin : confirmPin;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      currentVal.length > i
                        ? "bg-amber-500 scale-110 shadow-md shadow-amber-500/40"
                        : "bg-muted border border-border"
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-destructive font-bold animate-bounce">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg || "رمز المرور غير مطابق"}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {keys.map((k, i) =>
                k === "" ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() => handleKeyClick(k)}
                    className="h-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none shadow-sm"
                  >
                    {k === "back" ? "⌫" : k}
                  </button>
                )
              )}
            </div>
          </div>
        ) : mode === "pin" ? (
          <div className="space-y-4">
            {/* PIN Dots */}
            <div className="flex justify-center items-center gap-3 py-2" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pin.length > i
                      ? "bg-amber-500 scale-110 shadow-md shadow-amber-500/40"
                      : "bg-muted border border-border"
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-destructive font-bold animate-bounce">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg || "رمز المرور غير صحيح، حاول مرة أخرى"}</span>
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {keys.map((k, i) =>
                k === "" ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() => handleKeyClick(k)}
                    className="h-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-lg font-bold flex items-center justify-center active:scale-95 transition-transform select-none shadow-sm"
                  >
                    {k === "back" ? "⌫" : k}
                  </button>
                )
              )}
            </div>

            {/* Actions / Biometric / Fallback */}
            <div className="pt-2 space-y-2">
              {hasBiometrics && (
                <button
                  onClick={handleBiometricUnlock}
                  disabled={isVerifyingBio}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-amber-500/20"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>فتح بالبصمة / قفل الهاتف</span>
                </button>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                {/* في الوضع الصارم: لا يوجد "نسيت الرمز" — لا تجاوز */}
                {strictMode ? (
                  <span className="text-amber-600/70 dark:text-amber-400/70 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>وضع الأطفال — لا يمكن الخروج بدون الرمز</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setError(false);
                      setMode("math");
                    }}
                    className="hover:underline flex items-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>نسيت الرمز؟ سؤال حسابي</span>
                  </button>
                )}

                <button
                  onClick={handleManualSubmit}
                  disabled={pin.length < 4}
                  className="text-amber-600 dark:text-amber-400 font-bold disabled:opacity-40"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-2xl font-bold font-mono py-3 text-foreground" dir="ltr">
              {num1} × {num2} ={" "}
              <span className="text-amber-500 border-b-2 border-dashed border-amber-500 px-2">
                {mathAnswer || "?"}
              </span>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium animate-bounce">
                {errorMsg || "إجابة غير صحيحة، حاول مجدداً"}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {keys.map((k, i) =>
                k === "" ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() => {
                      setError(false);
                      if (k === "back") setMathAnswer((p) => p.slice(0, -1));
                      else if (mathAnswer.length < 3) setMathAnswer((p) => p + k);
                    }}
                    className="h-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
                  >
                    {k === "back" ? "⌫" : k}
                  </button>
                )
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setError(false);
                  setMode("pin");
                }}
                className="flex-1 py-2.5 rounded-2xl bg-secondary text-muted-foreground text-sm font-bold flex items-center justify-center gap-1"
              >
                <KeyRound className="w-4 h-4" />
                <span>العودة للرمز السري</span>
              </button>
              <button
                onClick={handleMathSubmit}
                disabled={!mathAnswer}
                className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
