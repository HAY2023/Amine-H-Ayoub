/** قفل ركن الأطفال — رمز من ٤ أرقام ووضع مقفل، مشترك بين القارئ والألعاب والإعدادات. */
const PIN_KEY = "mushaf:kidsPin";
const MODE_KEY = "mushaf:kidsMode";
const APP_MODE_KEY = "mushaf:appMode:v1";

export const getKidsPin = (): string => { try { return localStorage.getItem(PIN_KEY) || ""; } catch { return ""; } };
export const setKidsPin = (p: string) => { try { localStorage.setItem(PIN_KEY, p); } catch { /* ignore */ } };
export const hasKidsPin = (): boolean => getKidsPin().length >= 4;

export const isKidsMode = (): boolean => { try { return localStorage.getItem(MODE_KEY) === "1"; } catch { return false; } };
export const setKidsLocked = (on: boolean) => {
  try {
    localStorage.setItem(MODE_KEY, on ? "1" : "0");
    localStorage.setItem(APP_MODE_KEY, on ? "kids" : "parent");
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mushaf:kidsmode"));
    window.dispatchEvent(new Event("mushaf:appmode"));
  }
};
