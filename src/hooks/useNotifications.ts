import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

// 1. وقت دراسة الطفل (بعد 10 دقائق من فتح التطبيق)
const STUDY_REMINDER_DELAY = 10 * 60 * 1000; 

// 2. إعلان تعليمي أو تشجيع (بعد 30 دقيقة)
const AD_REMINDER_DELAY = 30 * 60 * 1000;

// 3. الدعم الفني (بعد 60 دقيقة)
const SUPPORT_REMINDER_DELAY = 60 * 60 * 1000;

export function useNotifications() {
  useEffect(() => {
    const studyTimer = setTimeout(() => {
      toast({
        title: "📚 وقت المراجعة!",
        description: "لا تنسَ تخصيص وقت لمراجعة ما حفظته اليوم لتثبيت الحفظ.",
        duration: 8000,
      });
    }, STUDY_REMINDER_DELAY);

    const adTimer = setTimeout(() => {
      toast({
        title: "🌟 تشجيع للإنجاز",
        description: "هل تعلم أن تكرار الاستماع يسهل الحفظ بشكل كبير؟ استمر يا بطل!",
        duration: 8000,
      });
    }, AD_REMINDER_DELAY);

    const supportTimer = setTimeout(() => {
      toast({
        title: "🛠️ الدعم الفني",
        description: "إذا واجهت أي مشكلة أو احتجت للمساعدة، نحن هنا دائماً لدعمك وتطوير التطبيق.",
        duration: 10000,
      });
    }, SUPPORT_REMINDER_DELAY);

    return () => {
      clearTimeout(studyTimer);
      clearTimeout(adTimer);
      clearTimeout(supportTimer);
    };
  }, []);
}
