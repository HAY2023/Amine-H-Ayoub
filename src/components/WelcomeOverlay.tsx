import { useState } from "react";
import { Youtube, Check, BookOpen } from "lucide-react";
import { TermsText, RECITER_URL } from "../pages/SettingsPage";

const ONBOARD_KEY = "mushaf:onboarded:v1";

export const isOnboarded = (): boolean => {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return true; }
};

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const finish = () => { try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ } onDone(); };
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-y-auto" dir="rtl">
      <div className="mx-auto max-w-md px-5 py-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500 text-black flex items-center justify-center"><BookOpen className="w-9 h-9" /></div>
          <h1 className="text-2xl font-extrabold text-amber-300">مرحباً بك</h1>
          <p className="text-slate-300 leading-relaxed">تطبيق تعليم القرآن للأطفال — يقرأ المعلّم وتُكرّر معه، مع ألعاب تعليمية وركن أطفال آمن.</p>
        </div>

        <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4">
          <h3 className="font-bold text-amber-300 mb-2">بنود الاستخدام</h3>
          <TermsText />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 accent-amber-500" />
          <span className="font-bold">أوافق على بنود الاستخدام</span>
        </label>

        <a href={RECITER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold p-3 active:scale-95">
          <Youtube className="w-5 h-5" /> اشترك بقناة القارئ حاج أيوب أمين
        </a>

        <button onClick={finish} disabled={!agreed} className="w-full p-4 rounded-2xl bg-amber-500 text-black font-extrabold disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2">
          <Check className="w-5 h-5" /> ابدأ
        </button>
      </div>
    </div>
  );
}
