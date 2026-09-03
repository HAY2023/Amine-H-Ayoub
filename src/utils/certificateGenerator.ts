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
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. تدرج الخلفية العاجية الملكية الفاخرة
  const bg = ctx.createLinearGradient(0, 0, 1080, 1440);
  bg.addColorStop(0, "#FAF6EE");
  bg.addColorStop(0.5, "#F8F2E2");
  bg.addColorStop(1, "#F3E9D2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1440);

  // شبكة إسلامية رقيقة
  ctx.strokeStyle = "rgba(197, 160, 89, 0.08)";
  ctx.lineWidth = 1.5;
  for (let x = 40; x < 1080; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1440);
    ctx.stroke();
  }
  for (let y = 40; y < 1440; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }

  // 2. إطار مزدوج مع زوايا أندلسية
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, 1008, 1368);

  ctx.strokeStyle = "#AA771C";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(48, 48, 984, 1344);

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
  drawCorner(1032, 48, -1, 1);
  drawCorner(48, 1392, 1, -1);
  drawCorner(1032, 1392, -1, -1);

  // 3. البسملة الشريفة
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 26px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.textAlign = "center";
  ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 540, 96);

  // 4. شريط العنوان الأخضر والذهبي
  const ribbon = ctx.createLinearGradient(190, 118, 890, 190);
  ribbon.addColorStop(0, "#124325");
  ribbon.addColorStop(0.5, "#1B6338");
  ribbon.addColorStop(1, "#124325");
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  ctx.roundRect(190, 118, 700, 72, 24);
  ctx.fill();

  ctx.strokeStyle = "#E5C058";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#FFF7D6";
  ctx.font = "bold 34px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("شَهَادَةُ تَمَيُّزٍ وَإِنْجَازٍ قُرْآنِيّ", 540, 166);

  ctx.fillStyle = "#555555";
  ctx.font = "bold 21px 'Tahoma', 'Arial'";
  ctx.fillText("تُمنح هذه الشهادة المباركة تقديراً واعتزازاً بالهمة العالية", 540, 230);

  // 5. شخصية الطفل (Avatar)
  const avatarCenterY = 340;
  const avatarRadius = 78;

  const aura = ctx.createRadialGradient(540, avatarCenterY, avatarRadius - 10, 540, avatarCenterY, avatarRadius + 28);
  aura.addColorStop(0, "rgba(245, 197, 66, 0.45)");
  aura.addColorStop(1, "rgba(245, 197, 66, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(540, avatarCenterY, avatarRadius + 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(540, avatarCenterY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  try {
    const avatarImg = await loadCanvasImage(`/avatars/${profile.avatar || "boy1"}.png`);
    if (avatarImg && avatarImg.naturalWidth > 0) {
      ctx.drawImage(avatarImg, 540 - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } else {
      drawCanvasStar(ctx, 540, avatarCenterY, 44, "#F4C542");
    }
  } catch {
    drawCanvasStar(ctx, 540, avatarCenterY, 44, "#F4C542");
  }
  ctx.restore();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(540, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();

  drawCanvasStar(ctx, 425, avatarCenterY, 13, "#E5C058");
  drawCanvasStar(ctx, 655, avatarCenterY, 13, "#E5C058");

  // 6. صفة واسم الطالب بتنسيق سليم
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 26px 'Traditional Arabic', 'Amiri', 'Cairo', serif";
  ctx.fillText("الْقَارِئُ الْحَافِظُ الْمُبَارَكُ", 540, 440);

  ctx.fillStyle = "#0E4D2B";
  ctx.font = "bold 46px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText(profile.name || "بطل القرآن الكريم", 540, 485);

  ctx.fillStyle = "#555555";
  ctx.font = "19px 'Tahoma', 'Arial'";
  ctx.fillText("لمواظبته على تلاوة وحفظ كتاب الله الكريم برواية ورش عن نافع", 540, 520);

  // 7. شبكة بطاقات الإحصائيات (2 × 2)
  const curSurahName = SURAHS.find((s) => s.number === currentSurahNumber)?.name || "النبأ";
  const statCards = [
    { title: "دقائق التلاوة والمدارسة", value: `${minutes || 0} دقيقة`, color: "#16A34A", icon: "⏱️" },
    { title: "رصيد النجوم المكتسبة", value: `${coins.toLocaleString("en-US")} نجمة`, color: "#D97706", icon: "⭐" },
    { title: "أيام المداومة والاستمرار", value: `${streakDays || 1} يوم متتالي`, color: "#EA580C", icon: "🔥" },
    { title: "السورة الحالية المتقنة", value: `سورة ${curSurahName}`, color: "#2563EB", icon: "📖" },
  ];

  const cardPositions = [
    { x: 100, y: 555, w: 425, h: 90 },
    { x: 555, y: 555, w: 425, h: 90 },
    { x: 100, y: 660, w: 425, h: 90 },
    { x: 555, y: 660, w: 425, h: 90 },
  ];

  statCards.forEach((st, idx) => {
    const pos = cardPositions[idx];
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(pos.x, pos.y, pos.w, pos.h, 18);
    ctx.fill();

    ctx.strokeStyle = "#E8DCBF";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(pos.x + 45, pos.y + 45, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "22px 'Tahoma', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st.icon, pos.x + 45, pos.y + 53);

    ctx.textAlign = "right";
    ctx.fillStyle = "#777777";
    ctx.font = "bold 14px 'Tahoma', 'Arial'";
    ctx.fillText(st.title, pos.x + pos.w - 18, pos.y + 34);

    ctx.fillStyle = "#222222";
    ctx.font = "bold 23px 'Tahoma', 'Arial'";
    ctx.fillText(st.value, pos.x + pos.w - 18, pos.y + 68);
  });

  // 8. لوحة الحديث الشريف
  const hadithY = 775;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.beginPath();
  ctx.roundRect(160, hadithY, 760, 74, 20);
  ctx.fill();
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawCanvasStar(ctx, 190, hadithY + 37, 10, "#E5C058");
  drawCanvasStar(ctx, 890, hadithY + 37, 10, "#E5C058");

  ctx.textAlign = "center";
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 25px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »", 540, hadithY + 38);

  ctx.fillStyle = "#777777";
  ctx.font = "14px 'Tahoma', 'Arial'";
  ctx.fillText("— قال رسول الله ﷺ —", 540, hadithY + 62);

  // 9. البطاقة الرسمية المعتمدة
  const footCardY = 875;
  const footCardH = 490;
  const footGrad = ctx.createLinearGradient(70, footCardY, 1010, footCardY + footCardH);
  footGrad.addColorStop(0, "#FFFFFF");
  footGrad.addColorStop(0.5, "#FDFBF7");
  footGrad.addColorStop(1, "#FAF6EE");
  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.roundRect(70, footCardY, 940, footCardH, 28);
  ctx.fill();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(82, footCardY + 12, 916, footCardH - 24, 20);
  ctx.stroke();

  // صورة التطبيق
  const appImgCenterY = footCardY + 115;
  const appImgCenterX = 185;
  const appImgRadius = 60;

  const appAura = ctx.createRadialGradient(appImgCenterX, appImgCenterY, appImgRadius - 5, appImgCenterX, appImgCenterY, appImgRadius + 18);
  appAura.addColorStop(0, "rgba(212, 175, 55, 0.4)");
  appAura.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = appAura;
  ctx.beginPath();
  ctx.arc(appImgCenterX, appImgCenterY, appImgRadius + 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(appImgCenterX, appImgCenterY, appImgRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  const appPhoto = (await loadCanvasImage("/my-photo.png")) || (await loadCanvasImage("/pwa-512x512.png"));
  if (appPhoto && appPhoto.naturalWidth > 0) {
    ctx.drawImage(appPhoto, appImgCenterX - appImgRadius, appImgCenterY - appImgRadius, appImgRadius * 2, appImgRadius * 2);
  } else {
    drawCanvasStar(ctx, appImgCenterX, appImgCenterY, 36, "#D4AF37");
  }
  ctx.restore();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(appImgCenterX, appImgCenterY, appImgRadius + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "right";
  ctx.fillStyle = "#0E4D2B";
  ctx.font = "bold 32px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("تَطْبِيقُ الْمُصْحَفِ الْمُرَتَّلِ بِرِوَايَةِ وَرْش", 955, footCardY + 80);

  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 24px 'Traditional Arabic', 'Amiri', 'Cairo', 'Tahoma', serif";
  ctx.fillText("الْقَارِئُ الشَّيْخُ حَاج أَيُّوب أَمِين", 955, footCardY + 122);

  ctx.fillStyle = "#555555";
  ctx.font = "17px 'Tahoma', 'Arial'";
  ctx.fillText("ركن أبطال القرآن الكريم وتحدي الحفظ والمدارسة المتقنة للأطفال", 955, footCardY + 160);

  // خط فاصل
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110, footCardY + 205);
  ctx.lineTo(970, footCardY + 205);
  ctx.stroke();

  // ختم التميز
  const sealX = 270;
  const sealY = footCardY + 315;
  ctx.save();
  ctx.translate(sealX, sealY);

  ctx.fillStyle = "#F59E0B";
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    const r = i % 2 === 0 ? 58 : 50;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#92400E";
  ctx.beginPath();
  ctx.arc(0, 0, 47, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#FDE68A";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px 'Tahoma', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("وسام التميّز", 0, -10);
  ctx.fillText("حفظ القرآن", 0, 8);
  ctx.fillText("مُعْتَمَد ✓", 0, 24);
  drawCanvasStar(ctx, 0, 36, 6, "#FDE68A");
  ctx.restore();

  // توقيع المشرف
  ctx.textAlign = "right";
  ctx.fillStyle = "#333333";
  ctx.font = "bold 19px 'Tahoma', 'Arial'";
  ctx.fillText("تَوْقِيعُ وَإِشْرَافُ الْمُقْرِئِ", 955, footCardY + 270);

  ctx.fillStyle = "#0E4D2B";
  ctx.font = "bold 26px 'Traditional Arabic', 'Amiri', 'Cairo', serif";
  ctx.fillText("الْقَارِئُ الشَّيْخُ أَمِين حَاج أَيُّوب", 955, footCardY + 312);

  ctx.fillStyle = "#666666";
  ctx.font = "italic 16px 'Tahoma', sans-serif";
  ctx.fillText("« غفر الله له ولوالديه ولمن قرأ واستمع »", 955, footCardY + 345);

  // خانة التاريخ المنظمة
  const today = new Date();
  const dateBoxW = 440;
  const dateBoxH = 64;
  const dateBoxX = 515;
  const dateBoxY = footCardY + 395;

  ctx.fillStyle = "rgba(245, 197, 66, 0.15)";
  ctx.beginPath();
  ctx.roundRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 16);
  ctx.fill();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#8C6514";
  ctx.font = "bold 14px 'Tahoma', 'Arial'";
  ctx.fillText("تَارِيخُ التَّمَيُّزِ وَالإِنْجَازِ", dateBoxX + dateBoxW / 2, dateBoxY + 24);

  ctx.fillStyle = "#854D0E";
  ctx.font = "bold 20px 'Tahoma', 'Arial'";
  ctx.fillText(`${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()} م`, dateBoxX + dateBoxW / 2, dateBoxY + 50);

  ctx.textAlign = "center";
  ctx.fillStyle = "#166534";
  ctx.font = "bold 15px 'Tahoma', 'Arial'";
  ctx.fillText("🌸 مُبَارَكٌ هَذَا الإِنْجَازُ الْقُرْآنِيُّ 🌸", 280, dateBoxY + 36);

  // تحميل الشهادة
  const link = document.createElement("a");
  link.download = `شهادة-${profile.name || "بطل-القرآن"}-${today.toISOString().split("T")[0]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
