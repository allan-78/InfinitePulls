import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Auth change listeners array
let authChangeListeners = [];
let appModeChangeListeners = [];

export const clearStoredAuth = async () => {
  await SecureStore.deleteItemAsync("token");
  await AsyncStorage.multiRemove(["user", "userData", "appViewMode"]);
};

// Notify all listeners when auth state changes
export const notifyAuthChange = (user) => {
  authChangeListeners.forEach((listener) => listener(user));
};

// Subscribe to auth changes
export const onAuthChange = (callback) => {
  authChangeListeners.push(callback);

  // Return unsubscribe function
  return () => {
    authChangeListeners = authChangeListeners.filter((cb) => cb !== callback);
  };
};

export const notifyAppViewModeChange = (mode) => {
  appModeChangeListeners.forEach((listener) => listener(mode));
};

export const onAppViewModeChange = (callback) => {
  appModeChangeListeners.push(callback);

  return () => {
    appModeChangeListeners = appModeChangeListeners.filter(
      (cb) => cb !== callback
    );
  };
};

export const getAppViewMode = async () => {
  try {
    const mode = await AsyncStorage.getItem("appViewMode");
    return mode || "user";
  } catch (error) {
    console.error("Error getting app view mode", error);
    return "user";
  }
};

export const setAppViewMode = async (mode) => {
  try {
    await AsyncStorage.setItem("appViewMode", mode);
    notifyAppViewModeChange(mode);
  } catch (error) {
    console.error("Error setting app view mode", error);
  }
};

// Save token and user info
export const authenticate = async (data, next) => {
  try {
    const userData = {
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      id: data.user._id,
    };

    // Store JWT token securely using expo-secure-store
    await SecureStore.setItemAsync("token", data.token);
    // Store non-sensitive user info in AsyncStorage for quick access
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    await AsyncStorage.setItem(
      "appViewMode",
      data.user.role === "admin" ? "admin" : "user"
    );

    // Notify listeners about auth change
    notifyAuthChange(userData);
    notifyAppViewModeChange(data.user.role === "admin" ? "admin" : "user");

    if (next) next();
  } catch (error) {
    console.error("Error storing auth data", error);
  }
};

// Get user info
export const getUser = async () => {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) {
      await AsyncStorage.multiRemove(["user", "userData"]);
      return null;
    }

    const user = await AsyncStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Error getting user", error);
    return null;
  }
};

// Get JWT token from secure storage
export const getToken = async () => {
  try {
    const token = await SecureStore.getItemAsync("token");
    return token || null;
  } catch (error) {
    console.error("Error getting token", error);
    return null;
  }
};

// Check if admin
export const isAdmin = async () => {
  const user = await getUser();
  return user && user.role === "admin";
};

// Check if authenticated
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

// Logout
export const logout = async (navigation) => {
  try {
    await clearStoredAuth();

    // Notify listeners about auth change (user is now null)
    notifyAuthChange(null);

    // Navigate to Login screen if navigation object is provided
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  } catch (error) {
    console.error("Error logging out", error);
  }
};
