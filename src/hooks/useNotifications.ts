import { useEffect } from 'react';
import { requestNotificationPermission } from '@/utils/notifications';

export function useNotifications() {
  useEffect(() => {
    // طلب إذن الإشعارات بهدوء دون إزعاج المستخدم بمؤقتات وهمية
    void requestNotificationPermission();
  }, []);
}
