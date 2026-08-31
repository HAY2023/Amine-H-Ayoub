/**
 * الألعاب البعيدة — ألعاب HTML تُحمَّل من السيرفر (خارج كود التطبيق تماماً).
 * تُدار عبر ملف JSON على رابط عام (GitHub أو أي استضافة):
 * يمكن إضافة ألعاب جديدة مستقبلاً بمجرد تعديل الملف، دون تحديث التطبيق.
 */
import { setRemoteGamesList } from "./gameCatalog";

const URL_KEY = "mushaf:remoteGamesUrl";
const CACHE_KEY = "mushaf:remoteGames:v1";

/** الرابط الافتراضي لملف فهرس الألعاب (يمكن تغييره من الإعدادات/localStorage). */
export const DEFAULT_REMOTE_GAMES_URL = "https://raw.githubusercontent.com/HAY2023/Amine-H-Ayoub/main/kids-games/games.json";

export interface RemoteGameItem {
  id: string;
  title: string;
  icon?: string;
  ageMin?: number;
  cost?: number;
  kind: "url" | "html";
  url?: string;
  html?: string;
  desc?: string;
}

export const getRemoteGamesUrl = (): string => {
  try { return localStorage.getItem(URL_KEY) || DEFAULT_REMOTE_GAMES_URL; } catch { return DEFAULT_REMOTE_GAMES_URL; }
};

export const setRemoteGamesUrl = (url: string) => {
  try { localStorage.setItem(URL_KEY, url.trim()); } catch { /* ignore */ }
  void fetchRemoteGames();
};

const isValidRemote = (r: unknown): r is RemoteGameItem => {
  const d = r as RemoteGameItem;
  if (!d || typeof d.id !== "string" || typeof d.title !== "string") return false;
  if (d.kind !== "url" && d.kind !== "html") return false;
  if (d.kind === "url") return typeof d.url === "string" && /^https?:\/\//.test(d.url);
  return typeof d.html === "string" && d.html.length > 10;
};

const readCache = (): RemoteGameItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(v) ? v.filter(isValidRemote) : [];
  } catch { return []; }
};

/** الألعاب البعيدة المخزّنة محلياً (آخر جلب ناجح). */
export const getRemoteGames = (): RemoteGameItem[] => readCache();

/** يجلب فهرس الألعاب من السيرفر ويحدّث الفهرس فوراً (بلا تحديث للتطبيق). */
export const fetchRemoteGames = async (): Promise<number> => {
  if (typeof window === "undefined") return 0;
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  try {
    const res = await fetch(`${getRemoteGamesUrl()}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list: RemoteGameItem[] = Array.isArray(json) ? json : Array.isArray(json?.games) ? json.games : [];
    const clean = list.filter(isValidRemote);
    localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
    setRemoteGamesList(clean);
    window.dispatchEvent(new Event("mushaf:gamecatalog"));
    return clean.length;
  } catch (e) {
    console.debug("remote games fetch:", e);
    // عند الفشل نستخدم آخر نسخة مخزّنة (عمل دون إنترنت)
    setRemoteGamesList(readCache());
    return 0;
  }
};

const HTML_CACHE_KEY = "mushaf:remoteGamesHtml:v1";

const readHtmlCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(HTML_CACHE_KEY) || "{}"); } catch { return {}; }
};

/** كود لعبة محمَّل سابقاً على الجهاز (يعمل دون إنترنت). */
export const getCachedGameHtml = (id: string): string | null => readHtmlCache()[id] || null;

export const cacheGameHtml = (id: string, html: string) => {
  try { const o = readHtmlCache(); o[id] = html; localStorage.setItem(HTML_CACHE_KEY, JSON.stringify(o)); } catch { /* ignore */ }
};

/**
 * تحميل أكواد الألعاب البعيدة للجهاز في الخلفية أثناء وجود اتصال —
 * كي تعمل كل الألعاب لاحقاً دون إنترنت (يستدعى عند فتح ركن الأطفال).
 */
export const precacheRemoteGames = async (): Promise<number> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  let n = 0;
  for (const g of getRemoteGames()) {
    if (g.kind !== "url" || !g.url || getCachedGameHtml(g.id)) continue;
    try {
      const res = await fetch(g.url, { cache: "no-store" });
      if (res.ok) { cacheGameHtml(g.id, await res.text()); n++; }
    } catch { /* تجاهل — سيعاد لاحقاً */ }
  }
  return n;
};