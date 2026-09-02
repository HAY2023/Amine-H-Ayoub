export interface KidsSchedule {
  enabled: boolean;
  allowedDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:MM" 24h format
  endTime: string;   // "HH:MM" 24h format
}

const DEFAULT_SCHEDULE: KidsSchedule = {
  enabled: false,
  allowedDays: [5, 6], // Friday, Saturday default
  startTime: "15:00",
  endTime: "18:00"
};

const SCHEDULE_KEY = "mushaf:kids_schedule";

export function getKidsSchedule(): KidsSchedule {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SCHEDULE;
}

export function saveKidsSchedule(schedule: KidsSchedule) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

export function isTimeAllowed(): { allowed: boolean; reason?: string } {
  const schedule = getKidsSchedule();
  if (!schedule.enabled) return { allowed: true };

  const now = new Date();
  const currentDay = now.getDay();
  
  if (!schedule.allowedDays.includes(currentDay)) {
    return { allowed: false, reason: "اليوم غير مسموح باللعب في الجدول" };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = schedule.startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const endMinutes = endH * 60 + endM;

  if (currentMinutes < startMinutes) {
    return { allowed: false, reason: "وقت اللعب لم يبدأ بعد" };
  }
  
  if (currentMinutes >= endMinutes) {
    return { allowed: false, reason: "لقد انتهى وقت اللعب المخصص اليوم" };
  }

  return { allowed: true };
}
