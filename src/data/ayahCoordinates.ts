export interface AyahBox {
  surah: number;
  ayah: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export const getPageAyahBoxes = (pageSrc: string) => AYAH_COORDINATES[pageSrc] ?? [];