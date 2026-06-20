import { useNavigate } from "react-router-dom";
import { User, Plus, Settings } from "lucide-react";
import { getProfiles, getAppMode, setActiveProfile, type KidsProfile } from "../data/kidsProfile";
import { getKidsPin } from "../data/kidsLock";
import { toast } from "../hooks/use-toast";

const PICKED_FLAG = "mushaf:pickedSession";

/** يُعلِّم أنّ ملفّاً اختير في هذه الجلسة (حتى لا تتكرّر شاشة الاختيار). */
export const markPicked = () => { try { sessionStorage.setItem(PICKED_FLAG, "1"); } catch { /* ignore */ } };
export const isPicked = (): boolean => { try { return sessionStorage.getItem(PICKED_FLAG) === "1"; } catch { return true; } };

/**
 * شاشة "من يتعلّم الآن؟" على غرار يوتيوب على التلفاز.
 * تُستخدم كطبقة عند فتح التطبيق (gate) أو كصفحة لتبديل الطفل (/profiles).
 */
export default function ProfilePicker({ onPicked }: { onPicked?: () => void }) {
  const navigate = useNavigate();
  const profiles: KidsProfile[] = getProfiles();
  const appMode = getAppMode();

  const close = () => { markPicked(); onPicked?.(); };
  const goHome = () => { close(); if (!onPicked) navigate("/"); };
  const pickChild = (id: string) => { setActiveProfile(id); goHome(); };
  const asParent = () => goHome();
  const manage = () => {
    const pin = getKidsPin();
    if (pin) { const p = (window.prompt("رمز ولي الأمر:") || "").trim(); if (p !== pin) { toast({ title: "رمز خاطئ", variant: "destructive" }); return; } }
    close(); navigate("/parent");
  };
  const goSettings = () => { close(); navigate("/settings"); };

  return (
    <div className="fixed inset-0 z-[95] text-white overflow-y-auto" dir="rtl"
      style={{ background: "linear-gradient(to bottom, rgba(15,23,42,0.92), rgba(15,23,42,0.97)), url('/background-kids.jpg') center/cover no-repeat", backgroundAttachment: "fixed" }}>
      <div className="mx-auto max-w-2xl px-5 py-10 min-h-full flex flex-col items-center justify-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-300 text-center mb-1">من يتعلّم الآن؟</h1>
        <p className="text-slate-300 text-sm text-center mb-8">اختر ملفّك للمتابعة</p>

        <div className="flex flex-wrap items-start justify-center gap-5 sm:gap-7">
          {profiles.map(p => (
            <button key={p.id} onClick={() => pickChild(p.id)} className="group flex flex-col items-center gap-2 w-24 sm:w-28 active:scale-95 transition-transform">
              <span className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br ${p.color} flex items-center justify-center text-5xl sm:text-6xl ring-2 ring-transparent group-hover:ring-white/70 shadow-xl`}>{p.avatar}</span>
              <span className="font-bold text-center truncate w-full">{p.name || "طفلي"}</span>
            </button>
          ))}

          {appMode === "both" && (
            <button onClick={asParent} className="group flex flex-col items-center gap-2 w-24 sm:w-28 active:scale-95 transition-transform">
              <span className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-700/80 border border-slate-600 flex items-center justify-center ring-2 ring-transparent group-hover:ring-white/70 shadow-xl"><User className="w-12 h-12 text-amber-300" /></span>
              <span className="font-bold text-center">وليّ الأمر</span>
            </button>
          )}

          <button onClick={manage} className="group flex flex-col items-center gap-2 w-24 sm:w-28 active:scale-95 transition-transform">
            <span className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-800/60 border border-dashed border-slate-600 flex items-center justify-center ring-2 ring-transparent group-hover:ring-white/50 shadow-xl"><Plus className="w-12 h-12 text-slate-300" /></span>
            <span className="font-bold text-center text-slate-300">إضافة / إدارة</span>
          </button>
        </div>

        <button onClick={goSettings} className="mt-10 inline-flex items-center gap-2 rounded-full bg-slate-800/70 border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 active:scale-95">
          <Settings className="w-4 h-4" /> الإعدادات
        </button>
      </div>
    </div>
  );
}
