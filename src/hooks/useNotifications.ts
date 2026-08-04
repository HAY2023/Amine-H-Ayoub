import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { requestNotificationPermission, showLocalNotification } from '@/utils/notifications';

// 1. وقت دراسة الطفل (بعد 10 دقائق من فتح التطبيق)
const STUDY_REMINDER_DELAY = 10 * 60 * 1000; 

// 2. إعلان تعليمي أو تشجيع (بعد 30 دقيقة)
const AD_REMINDER_DELAY = 30 * 60 * 1000;

// 3. الدعم الفني (بعد 60 دقيقة)
const SUPPORT_REMINDER_DELAY = 60 * 60 * 1000;

export function useNotifications() {
  useEffect(() => {
    void requestNotificationPermission();

    const notify = (title: string, description: string) => {
      showLocalNotification(title, description);
      toast({ title, description, duration: 8000 });
    };

    const studyTimer = setTimeout(() => {
      notify("📚 وقت المراجعة!", "لا تنسَ تخصيص وقت لمراجعة ما حفظته اليوم لتثبيت الحفظ.");
    }, STUDY_REMINDER_DELAY);

    const adTimer = setTimeout(() => {
      notify("🌟 تشجيع للإنجاز", "هل تعلم أن تكرار الاستماع يسهل الحفظ بشكل كبير؟ استمر يا بطل!");
    }, AD_REMINDER_DELAY);

    const supportTimer = setTimeout(() => {
      notify("🛠️ الدعم الفني", "إذا واجهت أي مشكلة أو احتجت للمساعدة، نحن هنا دائماً لدعمك وتطوير التطبيق.");
    }, SUPPORT_REMINDER_DELAY);

    return () => {
      clearTimeout(studyTimer);
      clearTimeout(adTimer);
      clearTimeout(supportTimer);
    };
  }, []);
}
