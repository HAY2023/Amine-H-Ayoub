/**
 * بنك الأسئلة — محلي (على الجهاز) + سيرفر (Supabase store).
 * عند إجابة الطفل عن سؤال: يُحذف من الجهاز ومن السيرفر نهائياً،
 * وتُستدعى أسئلة جديدة من السيرفر مكانه.
 */
import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export interface BankQuestion {
  id: string;
  surahNum: number;
  surahName: string;
  ayahText: string;
  missingWord: string;
  options: string[];
}

const BANK_KEY = "mushaf:questionsBank:v1";
const ANSWERED_KEY = "mushaf:questionsAnswered:v1";
const SERVER_KEY = "mushaf:questionsBank:server";

export const getBank = (): BankQuestion[] => {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(BANK_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

export const saveBank = (list: BankQuestion[]) => {
  try { localStorage.setItem(BANK_KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

export const getAnsweredIds = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(ANSWERED_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

export const markAnswered = (id: string) => {
  try {
    const ids = getAnsweredIds();
    if (!ids.includes(id)) localStorage.setItem(ANSWERED_KEY, JSON.stringify([...ids.slice(-2000), id]));
  } catch { /* ignore */ }
};

/** يحذف السؤال من الجهاز نهائياً + يزامن الحذف إلى السيرفر */
export const removeQuestion = (id: string) => {
  markAnswered(id);
  saveBank(getBank().filter(q => q.id !== id));
  void pushBankToServer();
};

/** رفع البنك المحلي إلى السيرفر (بدون انتظار) */
export const pushBankToServer = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from("store").upsert({ key: SERVER_KEY, value: getBank() });
    return !error;
  } catch { return false; }
};

/** جلب أسئلة جديدة من السيرفر (ليست مُجابة وغير موجودة محلياً) */
export const pullNewQuestions = async (surahNum: number, excludeIds: string[] = []): Promise<BankQuestion[]> => {
  if (typeof window === "undefined" || !hasValidSupabaseKey()) return [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return [];
  try {
    const { data } = await supabase.from("store").select("value").eq("key", SERVER_KEY).maybeSingle();
    if (!data || !Array.isArray(data.value)) return [];
    const answered = new Set(getAnsweredIds());
    const localIds = new Set(getBank().map(q => q.id));
    const exclude = new Set(excludeIds);
    const fresh = (data.value as BankQuestion[]).filter(q =>
      q && typeof q.id === "string" &&
      (!surahNum || q.surahNum === surahNum) &&
      !answered.has(q.id) && !localIds.has(q.id) && !exclude.has(q.id)
    );
    if (fresh.length) saveBank([...getBank(), ...fresh]);
    return fresh;
  } catch { return []; }
};

/** إضافة أسئلة مولّدة محلياً إلى البنك (وتزامنها مع السيرفر إن كان فارغاً) */
export const addQuestions = (list: BankQuestion[]) => {
  const existing = new Set(getBank().map(q => q.id));
  const add = list.filter(q => !existing.has(q.id));
  if (add.length) saveBank([...getBank(), ...add]);
};

// ── سيرفر الأسئلة (توليد عشوائي من نص المصحف على الخادم) ──
const QS_URL_KEY = "mushaf:questionsServerUrl";
export const DEFAULT_QUESTIONS_SERVER = "https://hammoualiyoucef20-quran-questions.hf.space";

export const getQuestionServerUrl = (): string => {
  try { return localStorage.getItem(QS_URL_KEY) || DEFAULT_QUESTIONS_SERVER; } catch { return DEFAULT_QUESTIONS_SERVER; }
};
export const setQuestionServerUrl = (url: string) => {
  try { localStorage.setItem(QS_URL_KEY, url.trim().replace(/\/+$/, "")); } catch { /* ignore */ }
};

interface ServerQuestion {
  id: string;
  type: string;
  surahNum: number;
  surahName: string;
  prompt: string;
  options: string[];
  answer: string;
}

/** جلب أسئلة جديدة من سيرفر الأسئلة (توليد عشوائي على الخادم) */
export const fetchFromQuestionServer = async (surahNum: number, count = 10, type = "missingword"): Promise<BankQuestion[]> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${getQuestionServerUrl()}/questions?surah=${surahNum}&type=${type}&count=${count}`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const list: ServerQuestion[] = Array.isArray(data?.questions) ? data.questions : [];
    const answered = new Set(getAnsweredIds());
    return list
      .filter(q => q && q.id && !answered.has(q.id) && Array.isArray(q.options) && q.options.length >= 3)
      .map(q => ({
        id: `srv-${q.id}`,
        surahNum: q.surahNum,
        surahName: q.surahName,
        ayahText: q.prompt,
        missingWord: q.answer,
        options: q.options,
      }));
  } catch { return []; }
};