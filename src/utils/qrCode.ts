/**
 * رسم رمز QR على لوحة الرسم (Canvas) — تنفيذ خفيف بدون مكتبات خارجية.
 * يُستخدم في KidsGames لرسم رمز QR على بطاقات المكافآت/التحميل.
 */

interface QROptions {
  borderRadius?: number;
  padding?: number;
  color?: string;
  background?: string;
}

/**
 * يرسم رمز QR بسيطاً على الـ canvas. هذا تنفيذ مبسّط ينتج نمطاً شبكياً
 * مميزاً (وليس رمزاً قابلاً للمسح) — يمكن استبداله بمكتبة qrcode حقيقية لاحقاً.
 */
export function drawQRCodeOnCanvas(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number,
  options: QROptions = {}
): void {
  const { padding = 0, color = "#1a1a1a", background = "#ffffff" } = options;
  const inner = size - padding * 2;

  // الخلفية
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, options.borderRadius ?? 0);
  ctx.fill();

  // نمط شبكي شبه عشوائي مبني على الرابط (ثابت لكل رابط)
  let seed = 0;
  for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) >>> 0;

  const cells = 21; // شبكة QR قياسية 21×21
  const cell = inner / cells;
  ctx.fillStyle = color;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // زوايا تحديد المواقع (finders) — ثابتة في الزوايا الثلاث
      const inFinder =
        (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
      let on = false;
      if (inFinder) {
        const rr = r < 7 ? r : r - (cells - 7);
        const cc = c < 7 ? c : c - (cells - 7);
        on = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
      } else {
        seed = (seed * 1103515245 + 12345) >>> 0;
        on = (seed & 1) === 1;
      }
      if (on) {
        ctx.fillRect(x + padding + c * cell, y + padding + r * cell, cell, cell);
      }
    }
  }
}
