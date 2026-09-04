export interface ServerQuestion {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correct_answer: string;
}

const LOCAL_STORAGE_POOL_KEY = "mushaf:quiz_pool_v1";
const LOCAL_STORAGE_ANSWERED_KEY = "mushaf:quiz_answered_v1";

// ⚠️ عندما ترفع السيرفر على HuggingFace قم بتبديل هذا الرابط برابط الـ Space الخاص بك
const HUGGINGFACE_API_URL = "https://your-username-your-spacename.hf.space/api/questions";

// استرجاع الأسئلة المجابة من التخزين المحلي
export function getAnsweredQuestions(): string[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_ANSWERED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// إضافة سؤال إلى قائمة المجاب عليها
export function markQuestionAsAnswered(id: string) {
  try {
    const answered = getAnsweredQuestions();
    if (!answered.includes(id)) {
      answered.push(id);
      localStorage.setItem(LOCAL_STORAGE_ANSWERED_KEY, JSON.stringify(answered));
    }
  } catch (e) {
    console.error("Failed to mark question as answered", e);
  }
}

// مسح قائمة الأسئلة المجابة للبدء من جديد
export function clearAnsweredQuestions() {
  localStorage.removeItem(LOCAL_STORAGE_ANSWERED_KEY);
}

// الحصول على أسئلة المخزن المحلي الحالية
export function getLocalQuizPool(): ServerQuestion[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_POOL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// جلب وتحديث الأسئلة من السيرفر في الخلفية
export async function syncQuestionsFromServer() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.log("No internet connection. Using cached quiz pool.");
    return getLocalQuizPool();
  }

  try {
    const answered = getAnsweredQuestions();
    const excludeParam = answered.length > 0 ? `?exclude=${answered.join(",")}` : "";
    
    // جلب الأسئلة مع تجنب الكاش المؤقت لضمان أحدث نسخة
    const response = await fetch(`${HUGGINGFACE_API_URL}${excludeParam}`, {
      cache: "no-store",
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const questions: ServerQuestion[] = data.questions || [];
    const remaining: number = data.remaining || 0;

    // إذا نفدت جميع الأسئلة في السيرفر، نمسح الكاش ونبدأ من جديد
    if (questions.length === 0 && remaining === 0 && answered.length > 0) {
      console.log("All questions answered! Resetting answered list...");
      clearAnsweredQuestions();
      // نحاول مرة أخرى بعد تصفير القائمة
      return syncQuestionsFromServer();
    }

    if (questions.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_POOL_KEY, JSON.stringify(questions));
      return questions;
    }

    return getLocalQuizPool();
  } catch (error) {
    console.error("Failed to sync quiz from HuggingFace server:", error);
    // العودة لاستخدام المسبح المحلي إذا فشل الاتصال بالسيرفر
    return getLocalQuizPool();
  }
}
