import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  FacebookAuthProvider,
  initializeAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseKeys = ["apiKey", "authDomain", "projectId", "appId"];

const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => requiredFirebaseKeys.includes(key) && !value)
  .map(([key]) => key);

const optionalMissingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !requiredFirebaseKeys.includes(key) && !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(`Missing Firebase config values: ${missingKeys.join(", ")}`);
}

if (optionalMissingKeys.length > 0) {
  console.warn(
    `Optional Firebase config values not set: ${optionalMissingKeys.join(", ")}`
  );
}

const isFirebaseConfigured = missingKeys.length === 0;

let appInstance = null;
let authInstance = null;
let firebaseInitError = null;

const getFirebaseApp = () => {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (appInstance) {
    return appInstance;
  }

  try {
    appInstance = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);
    return appInstance;
  } catch (error) {
    firebaseInitError = error;
    console.warn(
      "Firebase app initialization failed:",
      error?.message || error
    );
    return null;
  }
};

const getFirebaseAuth = () => {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    return authInstance;
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      authInstance = getAuth(app);
      return authInstance;
    }
    firebaseInitError = error;
    console.warn(
      "Firebase auth initialization failed:",
      error?.message || error
    );
    return null;
  }
};

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export {
  facebookProvider,
  getFirebaseApp,
  getFirebaseAuth,
  googleProvider,
  isFirebaseConfigured,
  firebaseInitError,
};
