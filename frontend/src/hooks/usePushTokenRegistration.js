// CVPetShop/frontend/src/hooks/usePushTokenRegistration.js
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from './usePushNotifications';
import { getUser } from '../utils/helper';

export const usePushTokenRegistration = () => {
  useEffect(() => {
    const registerToken = async () => {
      const user = await getUser();
      if (user) {
        // Small delay to ensure everything is ready
        setTimeout(async () => {
          console.log('🔄 Auto-registering push token after login...');
          await registerForPushNotificationsAsync();
        }, 2000);
      }
    };

    registerToken();
  }, []);
};