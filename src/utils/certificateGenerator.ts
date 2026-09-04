import { KidsProfile } from "../data/kidsProfile";
import { SURAHS } from "../data/quranData";

function drawCanvasStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const size = i % 2 === 0 ? radius : radius * 0.42;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = encodeURI(src);
    setTimeout(() => resolve(null), 2500);
  });
}

export async function downloadQuranCertificate({
  profile,
  streakDays = 1,
  minutes = 0,
  coins = 0,
  currentSurahNumber = 36,
}: {
  profile: KidsProfile;
  streakDays?: number;
  minutes?: number;
  coins?: number;
  currentSurahNumber?: number;
}): Promise<void> {
  const canvas = document.createElement("canvas");
  const canvasW = 1080;
  const canvasH = 980;
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. تدرج الخلفية العاجية الملكية الفاخرة
  const bg = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  bg.addColorStop(0, "#FAF6EE");
  bg.addColorStop(0.5, "#F8F2E2");
  bg.addColorStop(1, "#F3E9D2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // شبكة إسلامية رقيقة
  ctx.strokeStyle = "rgba(197, 160, 89, 0.08)";
  ctx.lineWidth = 1.5;
  for (let x = 40; x < canvasW; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasH);
    ctx.stroke();
  }
  for (let y = 40; y < canvasH; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
  }

  // 2. إطار مزدوج مع زوايا أندلسية
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, canvasW - 72, canvasH - 72);

  ctx.strokeStyle = "#AA771C";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(48, 48, canvasW - 96, canvasH - 96);

  const drawCorner = (cx: number, cy: number, flipX: number, flipY: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(flipX, flipY);
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 48);
    ctx.quadraticCurveTo(8, 8, 48, 8);
    ctx.stroke();
    drawCanvasStar(ctx, 28, 28, 9, "#E5C058");
    ctx.restore();
  };
  drawCorner(48, 48, 1, 1);
  drawCorner(canvasW - 48, 48, -1, 1);
  drawCorner(48, canvasH - 48, 1, -1);
  drawCorner(canvasW - 48, canvasH - 48, -1, -1);

  // 3. البسملة الشريفة (خط مكبّر)
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 30px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.textAlign = "center";
  ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", canvasW / 2, 98);

  // 4. شريط العنوان الأخضر والذهبي (خط مكبّر وأكبر حجماً)
  const ribbonW = 740;
  const ribbonH = 76;
  const ribbonX = (canvasW - ribbonW) / 2;
  const ribbonY = 120;
  const ribbon = ctx.createLinearGradient(ribbonX, ribbonY, ribbonX + ribbonW, ribbonY + ribbonH);
  ribbon.addColorStop(0, "#124325");
  ribbon.addColorStop(0.5, "#1B6338");
  ribbon.addColorStop(1, "#124325");
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  ctx.roundRect(ribbonX, ribbonY, ribbonW, ribbonH, 26);
  ctx.fill();

  ctx.strokeStyle = "#E5C058";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#FFF7D6";
  ctx.font = "bold 38px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("شَهَادَةُ تَمَيُّزٍ وَإِنْجَازٍ قُرْآنِيّ", canvasW / 2, ribbonY + 52);

  // عبارة التكريم (مكبّرة)
  ctx.fillStyle = "#444444";
  ctx.font = "bold 25px 'Cairo', 'Tahoma', 'Arial'";
  ctx.fillText("تُمنح هذه الشهادة المباركة تقديراً واعتزازاً بالهمة العالية", canvasW / 2, 238);

  // 5. شخصية الطفل (Avatar) / الميدالية
  const avatarCenterY = 345;
  const avatarRadius = 82;

  const aura = ctx.createRadialGradient(canvasW / 2, avatarCenterY, avatarRadius - 10, canvasW / 2, avatarCenterY, avatarRadius + 30);
  aura.addColorStop(0, "rgba(245, 197, 66, 0.45)");
  aura.addColorStop(1, "rgba(245, 197, 66, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(canvasW / 2, avatarCenterY, avatarRadius + 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(canvasW / 2, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  try {
    const avatarImg = await loadCanvasImage(`/avatars/${profile.avatar || "boy1"}.png`);
    if (avatarImg && avatarImg.naturalWidth > 0) {
      ctx.drawImage(avatarImg, canvasW / 2 - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } else {
      drawCanvasStar(ctx, canvasW / 2, avatarCenterY, 48, "#F4C542");
    }
  } catch {
    drawCanvasStar(ctx, canvasW / 2, avatarCenterY, 48, "#F4C542");
  }
  ctx.restore();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(canvasW / 2, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();

  drawCanvasStar(ctx, canvasW / 2 - 120, avatarCenterY, 15, "#E5C058");
  drawCanvasStar(ctx, canvasW / 2 + 120, avatarCenterY, 15, "#E5C058");

  // 6. صفة واسم الطالب بتنسيق سليم وخط كبير جداً وواضح
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 28px 'Traditional Arabic', 'Amiri', 'Cairo', serif";
  ctx.fillText("الْقَارِئُ الْحَافِظُ الْمُبَارَكُ", canvasW / 2, 458);

  ctx.fillStyle = "#0E4D2B";
  ctx.font = "bold 52px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText(profile.name || "بطل القرآن الكريم", canvasW / 2, 510);

  ctx.fillStyle = "#4B5563";
  ctx.font = "bold 21px 'Cairo', 'Tahoma', 'Arial'";
  ctx.fillText("لمواظبته على تلاوة وحفظ كتاب الله الكريم برواية ورش عن نافع", canvasW / 2, 548);

  // 7. شبكة بطاقات الإحصائيات (2 × 2) مع خطوط مكبّرة
  const curSurahName = SURAHS.find((s) => s.number === currentSurahNumber)?.name || "النبأ";
  const statCards = [
    { title: "دقائق التلاوة والمدارسة", value: `${minutes || 0} دقيقة`, color: "#16A34A", icon: "⏱️" },
    { title: "رصيد النجوم المكتسبة", value: `${coins.toLocaleString("en-US")} نجمة`, color: "#D97706", icon: "⭐" },
    { title: "أيام المداومة والاستمرار", value: `${streakDays || 1} يوم متتالي`, color: "#EA580C", icon: "🔥" },
    { title: "السورة الحالية المتقنة", value: `سورة ${curSurahName}`, color: "#2563EB", icon: "📖" },
  ];

  const cardW = 430;
  const cardH = 92;
  const cardPositions = [
    { x: 95, y: 588, w: cardW, h: cardH },
    { x: 555, y: 588, w: cardW, h: cardH },
    { x: 95, y: 696, w: cardW, h: cardH },
    { x: 555, y: 696, w: cardW, h: cardH },
  ];

  statCards.forEach((st, idx) => {
    const pos = cardPositions[idx];
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 20);
    ctx.fill();

    ctx.strokeStyle = "#E8DCBF";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(pos.x + 48, pos.y + 46, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "24px 'Tahoma', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st.icon, pos.x + 48, pos.y + 55);

    ctx.textAlign = "right";
    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 16px 'Cairo', 'Tahoma', 'Arial'";
    ctx.fillText(st.title, pos.x + pos.w - 20, pos.y + 36);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 26px 'Cairo', 'Tahoma', 'Arial'";
    ctx.fillText(st.value, pos.x + pos.w - 20, pos.y + 72);
  });

  // 8. لوحة الحديث الشريف بخط مكبّر ورسم أنيق
  const hadithY = 812;
  const hadithW = 780;
  const hadithH = 78;
  const hadithX = (canvasW - hadithW) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.roundRect(hadithX, hadithY, hadithW, hadithH, 22);
  ctx.fill();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  drawCanvasStar(ctx, hadithX + 32, hadithY + hadithH / 2, 11, "#E5C058");
  drawCanvasStar(ctx, hadithX + hadithW - 32, hadithY + hadithH / 2, 11, "#E5C058");

  ctx.textAlign = "center";
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 29px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »", canvasW / 2, hadithY + 41);

  ctx.fillStyle = "#6B7280";
  ctx.font = "bold 16px 'Cairo', 'Tahoma', 'Arial'";
  ctx.fillText("— قال رسول الله ﷺ —", canvasW / 2, hadithY + 66);

  // تحميل الشهادة المحسنة
  const today = new Date();
  const link = document.createElement("a");
  link.download = `شهادة-${profile.name || "بطل-القرآن"}-${today.toISOString().split("T")[0]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
