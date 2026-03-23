// CVPetShop/frontend/App.js
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, Alert, AppState } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import AppNavigator from "./src/Components/Navigation/AppNavigator";
import { getToken } from "./src/utils/helper";
import { registerForPushNotificationsAsync } from "./src/hooks/usePushNotifications";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Ultra_400Regular } from "@expo-google-fonts/ultra";

import { Provider } from "react-redux";
import store from "./src/redux/store";

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          SpaceGrotesk_400Regular,
          SpaceGrotesk_600SemiBold,
          SpaceGrotesk_700Bold,
          Ultra_400Regular,
        });

        // Initialize notifications
        await setupNotifications();

        // Add any other initialization here
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Small delay for demo
      } catch (e) {
        console.warn("Error during app initialization:", e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    // Setup notification listeners
    setupNotificationListeners();

    // Handle app state changes
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup on unmount
    return () => {
      cleanupNotificationListeners();
      subscription.remove();
    };
  }, []);

  const setupNotifications = async () => {
    try {
      if (Platform.OS === "android" && Constants.appOwnership === "expo") {
        console.log(
          "Skipping remote push notification setup in Expo Go on Android."
        );
        return;
      }

      // Set up Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("order-updates", {
          name: "Order Updates",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#f39c12",
          sound: "default",
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
        });
      }

      // Check if we have permission
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      const authToken = await getToken();
      if (authToken) {
        setTimeout(async () => {
          await registerForPushNotificationsAsync();
        }, 1200);
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  const setupNotificationListeners = () => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification received in foreground:", notification);

        // Optional: Show an alert when notification is received in foreground
        const { title, body } = notification.request.content;
        if (title && body) {
          Alert.alert(title, body, [{ text: "OK" }], { cancelable: true });
        }
      });

    // Listener for user tapping on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification tapped:", response);
        handleNotificationResponse(response);
      });
  };

  // ✅ FIXED: Use .remove() method instead of removeNotificationSubscription
  const cleanupNotificationListeners = () => {
    if (notificationListener.current) {
      notificationListener.current.remove();
    }
    if (responseListener.current) {
      responseListener.current.remove();
    }
  };

  const handleAppStateChange = (nextAppState) => {
    console.log("App state changed to:", nextAppState);
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;

    if (data && data.type === "ORDER_STATUS_UPDATE" && data.orderId) {
      // Navigate to order details
      if (navigationRef.current) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          navigationRef.current?.navigate("OrderDetails", {
            orderId: data.orderId,
            fromNotification: true,
          });
        }, 500);
      }
    } else if (
      data &&
      (data.type === "discount" || data.type === "PROMO_DISCOUNT") &&
      data.productId
    ) {
      // Navigate to product details
      if (navigationRef.current) {
        setTimeout(() => {
          navigationRef.current?.navigate("MainApp", {
            screen: "SingleProduct",
            params: {
              productId: data.productId,
              fromNotification: true,
            },
          });
        }, 500);
      }
    }
  };

  useEffect(() => {
    if (!appIsReady) {
      return;
    }

    const syncLaunchNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification) {
          handleNotificationResponse(response);
        }
      } catch (error) {
        console.warn("Failed to inspect launch notification:", error);
      }
    };

    const timer = setTimeout(syncLaunchNotification, 900);
    return () => clearTimeout(timer);
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // Splash screen is showing
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator ref={navigationRef} />
      </SafeAreaProvider>
    </Provider>
  );
}
