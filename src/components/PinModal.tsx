import { useState } from "react";
import { Lock, Delete } from "lucide-react";
import { getKidsPin, setKidsPin } from "../data/kidsLock";

/** لوحة رمز رقمية (٤ أرقام). mode="set" لتعيين الرمز، "verify" للتحقق. */
export default function PinModal({ mode, title, onSuccess, onCancel }: {
  mode: "set" | "verify";
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const press = (d: string) => {
    if (pin.length >= 4) return;
    const np = pin + d;
    setPin(np);
    setErr(false);
    if (np.length === 4) {
      window.setTimeout(() => {
        if (mode === "set") { setKidsPin(np); onSuccess(); }
        else if (np === getKidsPin()) { onSuccess(); }
        else { setErr(true); setPin(""); }
      }, 120);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" dir="rtl">
      <div className="w-full max-w-xs rounded-2xl bg-slate-800 border border-slate-700 p-5 space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center"><Lock className="w-6 h-6" /></div>
        <h3 className="font-extrabold text-white">{title || (mode === "set" ? "اختر رمزاً من ٤ أرقام" : "أدخل رمز ولي الأمر")}</h3>
        <div className={`flex justify-center gap-3 ${err ? "animate-pulse" : ""}`}>
          {[0, 1, 2, 3].map(i => <span key={i} className={`w-4 h-4 rounded-full transition-colors ${err ? "bg-red-500" : i < pin.length ? "bg-amber-400" : "bg-slate-600"}`} />)}
        </div>
        {err && <p className="text-xs text-red-400">رمز خاطئ، حاول مجدداً</p>}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((k, i) => k === "" ? <span key={i} /> : (
            <button key={i} onClick={() => (k === "back" ? setPin(p => p.slice(0, -1)) : press(k))}
              className="h-12 rounded-xl bg-slate-700 text-white text-xl font-bold flex items-center justify-center active:scale-95 hover:bg-slate-600">
              {k === "back" ? <Delete className="w-5 h-5" /> : k}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full p-2 rounded-xl bg-slate-700/60 text-slate-300 font-bold">إلغاء</button>
      </div>
    </div>
  );
}
