import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { FacebookAuthProvider, signInWithCredential } from "firebase/auth";
import { useDispatch } from "react-redux";
import { socialLogin } from "../../redux/actions/userActions";
import { getFirebaseAuth, isFirebaseConfigured } from "../../config/firebase";
import { authColors, authFonts } from "../../theme/authTheme";

WebBrowser.maybeCompleteAuthSession();

let googleSigninModule = null;

try {
  googleSigninModule = require("@react-native-google-signin/google-signin");
} catch (error) {
  googleSigninModule = null;
}

const GoogleSignin = googleSigninModule?.GoogleSignin ?? null;
const googleStatusCodes = googleSigninModule?.statusCodes ?? {};

const expoOwner = Constants.expoConfig?.owner || "allanmonforte123s-organization";
const expoSlug = Constants.expoConfig?.slug || "infinitepulls";
const expoProxyProject = `@${expoOwner}/${expoSlug}`;
const isExpoGo = Constants.appOwnership === "expo";
const expoRedirectUri = isExpoGo
  ? `https://auth.expo.io/${expoProxyProject}`
  : undefined;
const facebookNativeRedirectUri = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID
  ? `fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}://authorize`
  : undefined;

const facebookDiscovery = {
  authorizationEndpoint: "https://www.facebook.com/v6.0/dialog/oauth",
  tokenEndpoint: "https://graph.facebook.com/v6.0/oauth/access_token",
};

const hasGoogleClientId = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);
const hasNativeGoogleSignin = Boolean(GoogleSignin);

const hasFacebookClientId = Boolean(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID);

function GoogleSocialButton({ busyProvider, setBusyProvider }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (isExpoGo || !hasGoogleClientId || !hasNativeGoogleSignin) {
      return;
    }

    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
      profileImageSize: 120,
      scopes: ["profile", "email"],
    });
  }, []);

  return (
    <TouchableOpacity
      style={[styles.socialButton, styles.googleButton]}
      onPress={async () => {
        if (isExpoGo) {
          Alert.alert(
            "Google Login Needs A Build",
            "Google Sign-In now uses the native package. Test it in a development build or APK instead of Expo Go.",
          );
          return;
        }
        if (!hasNativeGoogleSignin) {
          Alert.alert(
            "Google Module Missing",
            "RNGoogleSignin is not in this app build yet. Rebuild and reinstall the development build or APK after adding the native package.",
          );
          return;
        }
        try {
          setBusyProvider("google");
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
          const response = await GoogleSignin.signIn();

          if (response?.type && response.type !== "success") {
            return;
          }

          let idToken = response?.data?.idToken || response?.idToken || null;

          if (!idToken) {
            const tokenResponse = await GoogleSignin.getTokens();
            idToken = tokenResponse?.idToken || null;
          }

          if (!idToken) {
            throw new Error(
              "Google did not return an ID token. Check the Google web client ID and Firebase Android SHA-1/SHA-256 setup for this APK.",
            );
          }

          await dispatch(socialLogin("google", { idToken }));
        } catch (err) {
          if (err?.code === googleStatusCodes.SIGN_IN_CANCELLED) {
            return;
          }

          Alert.alert(
            "Google Login Failed",
            err.response?.data?.message ||
              (String(err?.message || "")
                .toLowerCase()
                .includes("developer_error")
                ? "Google returned developer_error. The APK signing SHA-1/SHA-256 for this build still needs to be added to the Firebase Android app for com.infinitepulls.app."
                : err.message) ||
              "Unable to continue with Google.",
          );
        } finally {
          setBusyProvider(null);
        }
      }}
      disabled={busyProvider !== null}
    >
      {busyProvider === "google" ? (
        <ActivityIndicator color={authColors.darkText} />
      ) : (
        <>
          <Icon name="g-translate" size={18} color={authColors.darkText} />
          <Text style={styles.socialButtonText}>Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function FacebookSocialButton({ busyProvider, setBusyProvider }) {
  const dispatch = useDispatch();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
      redirectUri: isExpoGo ? expoRedirectUri : facebookNativeRedirectUri,
      scopes: ["public_profile"],
      responseType: "token",
      extraParams: {
        display: "popup",
      },
    },
    facebookDiscovery,
  );

  useEffect(() => {
    if (response?.type !== "success") {
      return;
    }

    const runFacebookLogin = async () => {
      try {
        setBusyProvider("facebook");
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error(
            "Firebase authentication is not available in this runtime.",
          );
        }
        const accessToken =
          response?.params?.access_token ||
          response?.authentication?.accessToken;

        if (!accessToken) {
          throw new Error(
            "Facebook did not return an access token. Check the Facebook app settings and redirect URIs.",
          );
        }

        const credential = FacebookAuthProvider.credential(accessToken);
        const userCredential = await signInWithCredential(auth, credential);
        const idToken = await userCredential.user.getIdToken();
        await dispatch(socialLogin("facebook", { idToken }));
      } catch (err) {
        Alert.alert(
          "Facebook Login Failed",
          err.response?.data?.message ||
            err.message ||
            "Unable to continue with Facebook.",
        );
      } finally {
        setBusyProvider(null);
      }
    };

    runFacebookLogin();
  }, [dispatch, response, setBusyProvider]);

  return (
    <TouchableOpacity
      style={[styles.socialButton, styles.facebookButton]}
      onPress={() => {
        setBusyProvider("facebook");
        promptAsync();
      }}
      disabled={!request || busyProvider !== null}
    >
      {busyProvider === "facebook" ? (
        <ActivityIndicator color={authColors.darkText} />
      ) : (
        <>
          <Icon name="facebook" size={18} color={authColors.darkText} />
          <Text style={styles.socialButtonText}>Facebook</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function SocialAuthSection({ title = "Or continue with" }) {
  const [busyProvider, setBusyProvider] = useState(null);

  const showSocialLogin = useMemo(
    () => isFirebaseConfigured && (hasGoogleClientId || hasFacebookClientId),
    [],
  );

  if (!showSocialLogin) {
    return null;
  }

  return (
    <View style={styles.socialCard}>
      <Text style={styles.socialTitle}>{title}</Text>
      <View style={styles.socialButtons}>
        {hasGoogleClientId ? (
          <GoogleSocialButton
            busyProvider={busyProvider}
            setBusyProvider={setBusyProvider}
          />
        ) : null}
        {hasFacebookClientId ? (
          <FacebookSocialButton
            busyProvider={busyProvider}
            setBusyProvider={setBusyProvider}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  socialCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  socialTitle: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.regular,
    marginBottom: 12,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 46,
  },
  googleButton: {
    backgroundColor: authColors.googleButton,
  },
  facebookButton: {
    backgroundColor: authColors.facebookButton,
  },
  socialButtonText: {
    color: authColors.darkText,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
});
