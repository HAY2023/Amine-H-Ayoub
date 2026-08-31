import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { addCoins, getCoins, getProfile } from "../data/kidsProfile";
import { getCachedGameHtml, cacheGameHtml } from "../data/remoteGames";
import type { GameDef } from "../data/gameCatalog";

/**
 * مشغّل الألعاب البعيدة — يعرض لعبة HTML قادمة من السيرفر داخل iframe معزول تماماً:
 * - sandbox بلا allow-same-origin: لا يمكن للعبة الوصول إلى بيانات التطبيق أو التخزين.
 * - التواصل فقط عبر postMessage برسائل موقّعة بالنوع "nour:game:*".
 *
 * بروتوكول اللعبة الخارجية:
 *   { type: "nour:game:stars", amount: 1 }  → تمنح نجوماً للطفل (بحدّ أقصى للحماية)
 *   { type: "nour:game:exit" }              → إغلاق اللعبة والعودة لقائمة الألعاب
 *   { type: "nour:game:ready" }             → التطبيق يرسل { type: "nour:game:profile", name, coins }
 */
const MAX_STARS_PER_MSG = 10;
const MAX_STARS_PER_SESSION = 100;

export default function RemoteGameFrame({ def, onExit }: { def: GameDef; onExit: () => void }) {
  const [coins, setCoins] = useState(getCoins());
  const [srcDoc, setSrcDoc] = useState<string | null>(def.remote?.kind === "html" ? def.remote.html ?? null : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const earnedRef = useRef(0);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  // لعبة من نوع "url": نعرض النسخة المخزّنة على الجهاز فوراً (تعمل دون إنترنت)،
  // ونحدّث الكود من السيرفر في الخلفية عند توفر الاتصال.
  useEffect(() => {
    let alive = true;
    const r = def.remote;
    if (r?.kind === "url" && r.url) {
      setLoadError(null);
      const cached = getCachedGameHtml(def.id);
      if (cached) setSrcDoc(cached);
      fetch(r.url, { cache: "no-store" })
        .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
        .then(html => {
          if (!alive) return;
          cacheGameHtml(def.id, html);
          setSrcDoc(html);
        })
        .catch(() => { if (alive && !cached) setLoadError(r.url || ""); });
    }
    return () => { alive = false; };
  }, [def.remote, def.id]);

  useEffect(() => {
    const h = () => setCoins(getCoins());
    window.addEventListener("mushaf:coins", h);
    return () => window.removeEventListener("mushaf:coins", h);
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; amount?: unknown } | null;
      if (!d || typeof d !== "object" || typeof d.type !== "string") return;
      if (!d.type.startsWith("nour:game:")) return;
      if (d.type === "nour:game:stars") {
        const n = Math.max(0, Math.min(MAX_STARS_PER_MSG, Math.floor(Number(d.amount) || 0)));
        if (!n) return;
        const allowed = Math.max(0, Math.min(n, MAX_STARS_PER_SESSION - earnedRef.current));
        if (!allowed) return;
        earnedRef.current += allowed;
        addCoins(allowed);
      } else if (d.type === "nour:game:ready") {
        frameRef.current?.contentWindow?.postMessage(
          { type: "nour:game:profile", name: getProfile().name, coins: getCoins() },
          "*"
        );
      } else if (d.type === "nour:game:exit") {
        exitRef.current();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const exit = useCallback(() => exitRef.current(), []);

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <button onClick={exit} className="flex h-9 items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-3.5 text-sm font-bold border border-border active:scale-95 transition-transform">
          <ArrowRight className="h-4 w-4" /> خروج
        </button>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent font-extrabold text-sm px-3 py-1.5">
          <Star className="w-4 h-4 fill-current" /> {coins}
        </span>
      </div>
      {loadError ? (
        <div className="card-nour p-6 text-center space-y-3">
          <p className="font-bold text-destructive">تعذّر تحميل اللعبة من السيرفر</p>
          <p className="text-xs text-muted-foreground break-all" dir="ltr">{loadError}</p>
          <button onClick={() => setLoadError(null)} className="btn-gold px-5 py-2 rounded-xl font-bold">إعادة المحاولة</button>
        </div>
      ) : srcDoc != null ? (
        <iframe
          ref={frameRef}
          title={def.title}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"
          allow="autoplay; fullscreen"
          className="w-full h-[70vh] rounded-2xl border border-border bg-white shadow-soft"
        />
      ) : (
        <div className="card-nour p-8 text-center text-sm text-muted-foreground">جارٍ تحميل اللعبة...</div>
      )}
      {def.remote?.desc && <p className="text-center text-[11px] text-muted-foreground">{def.remote.desc}</p>}
    </div>
  );
}
