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
const projectExperience = Constants.expoConfig?.owner && Constants.expoConfig?.slug
  ? `@${Constants.expoConfig.owner}/${Constants.expoConfig.slug}`
  : null;

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

    const response = await axios.post(
      backendUrl,
      {
        pushToken: token,
        source: Constants.appOwnership === "expo" ? "expo-go" : "native-app",
        platform: Platform.OS,
        applicationId: Application.applicationId || null,
        projectExperience,
        easProjectId:
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId ||
          null,
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

    console.log(
      "Token in DB:",
      verifyResponse.data.pushToken ? "✅ Present" : "❌ Missing",
    );

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
