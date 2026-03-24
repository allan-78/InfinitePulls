// CVPetShop/frontend/src/hooks/usePushNotifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { Platform } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../utils/helper";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const DEVICE_PUSH_TOKEN_KEY = "@infinitepulls_device_push_token";
export const IN_APP_NOTIFICATIONS_KEY = "@infinitepulls_notifications_v2";
export const LEGACY_NOTIFICATIONS_KEY = "@order_notifications";

export function normalizeStoredNotification(notification) {
  if (!notification) return null;

  if (notification.id && notification.title && notification.date) {
    return notification;
  }

  const content = notification.request?.content || notification.content || {};
  const data = content.data || notification.data || {};

  return {
    id:
      notification.request?.identifier ||
      `${data.type || "notif"}-${data.orderId || data.productId || Date.now()}`,
    title: content.title || "Notification",
    body: content.body || "You have a new update.",
    data,
    date: notification.date || new Date().toISOString(),
  };
}

export function dedupeStoredNotifications(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.id}-${item.data?.orderId || ""}-${item.data?.productId || ""}-${item.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function getStoredInAppNotifications() {
  try {
    const [saved, legacySaved] = await Promise.all([
      AsyncStorage.getItem(IN_APP_NOTIFICATIONS_KEY),
      AsyncStorage.getItem(LEGACY_NOTIFICATIONS_KEY),
    ]);

    const parsed = [
      ...(saved ? JSON.parse(saved) : []),
      ...(legacySaved ? JSON.parse(legacySaved) : []),
    ];

    return dedupeStoredNotifications(
      parsed.map(normalizeStoredNotification).filter(Boolean),
    ).slice(0, 50);
  } catch (error) {
    return [];
  }
}

export async function storeInAppNotifications(items = []) {
  const normalized = dedupeStoredNotifications(
    items.map(normalizeStoredNotification).filter(Boolean),
  ).slice(0, 50);

  await AsyncStorage.setItem(
    IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(normalized),
  );

  return normalized;
}

export async function appendInAppNotification(notification) {
  const normalized = normalizeStoredNotification(notification);

  if (!normalized) {
    return getStoredInAppNotifications();
  }

  const current = await getStoredInAppNotifications();
  const updated = dedupeStoredNotifications([normalized, ...current]).slice(
    0,
    50,
  );

  await AsyncStorage.setItem(
    IN_APP_NOTIFICATIONS_KEY,
    JSON.stringify(updated),
  );

  return updated;
}

export async function clearStoredInAppNotifications() {
  await AsyncStorage.multiRemove([
    IN_APP_NOTIFICATIONS_KEY,
    LEGACY_NOTIFICATIONS_KEY,
  ]);
  return [];
}

export async function getBackendPushRegistrationStatus() {
  try {
    const authToken = await getToken();

    if (!authToken) {
      return {
        saved: false,
        pushToken: null,
        pushTokens: [],
        pushTokenSource: null,
      };
    }

    const response = await axios.get(`${BACKEND_URL}/api/v1/users/push-token`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const pushTokens = Array.isArray(response.data?.pushTokens)
      ? response.data.pushTokens
      : [];

    return {
      saved: Boolean(response.data?.pushToken || pushTokens.length),
      pushToken: response.data?.pushToken || null,
      pushTokens,
      pushTokenSource: response.data?.pushTokenSource || null,
    };
  } catch (error) {
    return {
      saved: false,
      pushToken: null,
      pushTokens: [],
      pushTokenSource: null,
    };
  }
}

export async function getStoredDevicePushToken() {
  try {
    return await AsyncStorage.getItem(DEVICE_PUSH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function clearStoredDevicePushToken() {
  try {
    await AsyncStorage.removeItem(DEVICE_PUSH_TOKEN_KEY);
  } catch (error) {
    console.log("Failed to clear stored device push token:", error?.message);
  }
}

export async function registerForPushNotificationsAsync() {
  console.log("========== PUSH NOTIFICATION REGISTRATION START ==========");
  console.log("Timestamp:", new Date().toISOString());

  try {
    if (Platform.OS === "android" && Constants.appOwnership === "expo") {
      console.log(
        "Skipping remote push registration in Expo Go on Android. Use a development build for real push testing.",
      );
      return null;
    }

    // Check if user is logged in first
    const authToken = await getToken();
    console.log("Auth token present before registration:", !!authToken);

    if (!authToken) {
      console.log(
        "❌ No auth token - user not logged in, skipping push registration",
      );
      return null;
    }

    // Step 1: Check if physical device
    console.log("Step 1: Checking if physical device...");
    if (!Device.isDevice) {
      console.log(
        "❌ Not a physical device - push notifications require physical device",
      );
      return null;
    }
    console.log("✅ Physical device detected");

    // Step 2: Check permissions
    console.log("Step 2: Checking notification permissions...");
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("Current permission status:", existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("Permission request result:", status);
    }

    if (finalStatus !== "granted") {
      console.log("❌ Notification permissions not granted");
      return null;
    }
    console.log("✅ Notification permissions granted");

    // Step 3: Setup Android channel
    if (Platform.OS === "android") {
      console.log("Step 3: Setting up Android notification channel...");
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
      console.log("✅ Android channel created");
    }

    // Step 4: Get project ID
    console.log("Step 4: Getting Expo project ID...");

    // IMPORTANT: Fix your project ID in app.json first!
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.expoConfig?.projectId;

    console.log("Project ID:", projectId || "NOT FOUND");

    if (!projectId) {
      console.log("❌ No project ID found - check app.json configuration");
      console.log(
        "Please ensure your app.json has extra.eas.projectId set to a valid Expo project ID",
      );
      return null;
    }

    // Step 5: Get Expo push token
    console.log("Step 5: Getting Expo push token...");

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log("✅ Generated Expo push token:", token);
    await AsyncStorage.setItem(DEVICE_PUSH_TOKEN_KEY, token);

    // Step 6: Get auth token again
    console.log("Step 6: Getting auth token for backend...");
    const currentAuthToken = await getToken();

    if (!currentAuthToken) {
      console.log(
        "❌ No auth token - user not logged in, cannot save to backend",
      );
      return token;
    }

    // Step 7: Save to backend
    console.log("Step 7: Saving token to backend...");
    const backendUrl = `${BACKEND_URL}/api/v1/users/push-token`;
    const pushSource =
      Constants.appOwnership === "expo" ? "expo-go" : "native-app";

    const response = await axios.post(
      backendUrl,
      {
        pushToken: token,
        source: pushSource,
        platform: Platform.OS,
        applicationId: Application.applicationId || null,
      },
      {
        headers: {
          Authorization: `Bearer ${currentAuthToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Backend response:", response.status);

    // Step 8: Verify token was saved
    console.log("Step 8: Verifying token in database...");
    const verifyResponse = await axios.get(
      `${BACKEND_URL}/api/v1/users/push-token`,
      { headers: { Authorization: `Bearer ${currentAuthToken}` } },
    );

    const savedTokens = Array.isArray(verifyResponse.data?.pushTokens)
      ? verifyResponse.data.pushTokens
      : [];
    const tokenSaved =
      verifyResponse.data?.pushToken === token ||
      savedTokens.some((entry) => entry?.token === token);

    console.log(
      "Token in DB:",
      tokenSaved ? "✅ Present" : "❌ Missing",
    );
    console.log("Primary token source in DB:", verifyResponse.data?.pushTokenSource || "none");

    if (!tokenSaved) {
      throw new Error("Push token was not persisted on the backend");
    }

    console.log("========== PUSH NOTIFICATION REGISTRATION END ==========");
    return token;
  } catch (error) {
    console.log("❌ Fatal error in push registration:", error);
    if (error.response) {
      console.log("Error response:", error.response.data);
    }
    return null;
  }
}
