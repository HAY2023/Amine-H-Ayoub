import { supabase, hasValidSupabaseKey } from "../lib/supabase";

export interface AyahBox {
  surah: number;
  ayah: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional: precise audio segment bound to this highlight (in seconds) for the teacher. */
  audioStart?: number;
  audioEnd?: number;
  /** Optional: precise audio segment bound for the kids/child. */
  kidsStart?: number;
  kidsEnd?: number;
  /** Optional: which speaker section this segment belongs to (deprecated in favor of dual timing support). */
  speaker?: "teacher" | "kids";
  /** Optional: Custom name/label for the box (e.g. "البسملة") */
  label?: string;
}

const CALIBRATION_STORAGE_KEY = "mushaf:ayahCoordinates:v1";

const makeBoxes = (
  surah: number,
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
  columns = count,
): AyahBox[] => {
  const rows = Math.ceil(count / columns);
  const rowHeight = height / rows;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const itemsInRow = Math.min(columns, count - row * columns);
    const boxWidth = width / itemsInRow;
    return {
      surah,
      ayah: index + 1,
      x: x + width - boxWidth * (col + 1),
      y: y + rowHeight * row,
      width: boxWidth,
      height: rowHeight,
    };
  });
};

export const PAGE_IMAGE_SIZE = { width: 1260, height: 1929 };

export const AYAH_COORDINATES: Record<string, AyahBox[]> = {
  "/pages/fatiha.jpg": [
    { surah: 1, ayah: 1, x: 255, y: 630, width: 760, height: 150 },
    { surah: 1, ayah: 2, x: 255, y: 790, width: 760, height: 135 },
    { surah: 1, ayah: 3, x: 255, y: 930, width: 760, height: 140 },
    { surah: 1, ayah: 4, x: 255, y: 1075, width: 760, height: 145 },
    { surah: 1, ayah: 5, x: 255, y: 1225, width: 760, height: 145 },
    { surah: 1, ayah: 6, x: 255, y: 1375, width: 760, height: 145 },
    { surah: 1, ayah: 7, x: 255, y: 1525, width: 760, height: 140 },
  ],
  "/pages/600.jpg": [
    ...makeBoxes(14, 8, 140, 720, 980, 620, 2),
  ],
  "/pages/601.jpg": [
    ...makeBoxes(13, 3, 140, 240, 980, 255, 1),
    ...makeBoxes(12, 9, 140, 605, 980, 675, 3),
    ...makeBoxes(11, 5, 140, 1390, 980, 330, 2),
  ],
  "/pages/602.jpg": [
    ...makeBoxes(10, 4, 140, 250, 980, 300, 2),
    ...makeBoxes(9, 7, 140, 660, 980, 570, 2),
    ...makeBoxes(8, 3, 140, 1350, 980, 300, 1),
  ],
  "/pages/603.jpg": [
    ...makeBoxes(7, 6, 140, 245, 980, 520, 2),
    ...makeBoxes(6, 3, 140, 875, 980, 275, 1),
    ...makeBoxes(5, 5, 140, 1260, 980, 400, 2),
  ],
  "/pages/604.jpg": [
    ...makeBoxes(4, 4, 140, 245, 980, 315, 2),
    ...makeBoxes(3, 5, 140, 670, 980, 420, 2),
    ...makeBoxes(2, 6, 140, 1200, 980, 500, 2),
  ],
};

const cloneBoxes = (boxes: AyahBox[]) => boxes.map((box) => ({ ...box }));


export const syncCoordinatesFromServer = async () => {
  if (typeof window === "undefined") return;
  if (!hasValidSupabaseKey()) return; // skip sync when no valid API key
  try {
    const { data } = await supabase.from("store").select("value").eq("key", CALIBRATION_STORAGE_KEY).maybeSingle();
    if (data && data.value && Object.keys(data.value as any).length > 0) {
      // Server has data → mirror to local
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(data.value));
      window.dispatchEvent(new Event("mushaf:sync_complete"));
    } else {
      // Server empty → upload local copy so it persists across devices/refreshes
      const local = getSavedAyahCoordinates();
      if (Object.keys(local).length > 0) {
        await supabase.from("store").upsert({ key: CALIBRATION_STORAGE_KEY, value: local });
      }
    }
  } catch (e) {
    console.debug("Supabase sync info:", e);
  }
};

export const getSavedAyahCoordinates = (): Record<string, AyahBox[]> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getPageAyahBoxes = (pageSrc: string) => {
  const allSaved = getSavedAyahCoordinates();
  if (pageSrc in allSaved) {
    return cloneBoxes(allSaved[pageSrc]);
  }
  return cloneBoxes(AYAH_COORDINATES[pageSrc] ?? []);
};

export const savePageAyahBoxes = async (pageSrc: string, boxes: AyahBox[]) => {
  if (typeof window === "undefined") return;
  const saved = getSavedAyahCoordinates();
  saved[pageSrc] = cloneBoxes(boxes);
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(saved));
  try {
    await supabase.from("store").upsert({ key: CALIBRATION_STORAGE_KEY, value: saved });
  } catch (e) {
    console.error("Supabase save error:", e);
  }
};

export const resetPageAyahBoxes = async (pageSrc: string) => {
  if (typeof window === "undefined") return;
  const saved = getSavedAyahCoordinates();
  delete saved[pageSrc];
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(saved));
  try {
    await supabase.from("store").upsert({ key: CALIBRATION_STORAGE_KEY, value: saved });
  } catch (e) {
    console.error("Supabase delete error:", e);
  }
};

export const getAllPageSources = () => Object.keys(AYAH_COORDINATES);