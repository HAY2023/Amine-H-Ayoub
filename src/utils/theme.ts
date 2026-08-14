/**
 * أدوات المظهر (الثيم) — مستخلصة من SettingsPage
 * لتجنّب سحب SettingsPage بالكامل إلى الحزمة الرئيسية.
 */

const THEME_KEY = "mushaf:theme";

export const RECITER_PATH = "/reciter";

export const getTheme = (): "dark" | "light" => {
  try { return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "light"; } catch { return "light"; }
};

export const applyTheme = (t: "dark" | "light") => {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-theme", t);
  if (t === "light") el.classList.remove("dark"); else el.classList.add("dark");
};
