import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/actions/userActions";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AuthBackground from "./AuthBackground";
import SocialAuthSection from "./SocialAuthSection";
import { authColors, authFonts } from "../../theme/authTheme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const userLogin = useSelector((state) => state.userLogin);
  const { loading } = userLogin;

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    dispatch(login(email, password))
      .then(() => {})
      .catch((err) => {
        Alert.alert(
          "Login Failed",
          err.response?.data?.message || err.message || "Login failed",
        );
      });
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <Icon name="style" size={26} color={authColors.accentSoft} />
            <Text style={styles.brandText}>Card Store</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to keep your collection in sync.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.inputRow}>
              <Icon name="email" size={20} color={authColors.accentSoft} />
              <TextInput
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="rgba(243, 232, 255, 0.5)"
              />
            </View>

            <View style={styles.inputRow}>
              <Icon name="lock" size={20} color={authColors.accentSoft} />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                placeholderTextColor="rgba(243, 232, 255, 0.5)"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={20}
                  color={authColors.accentSoft}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <SocialAuthSection title="Or continue with" />

          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>New here?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.signUpLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === "ios" ? 90 : 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  brandText: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.semibold,
    letterSpacing: 0.5,
  },
  title: {
    color: authColors.textPrimary,
    fontSize: 32,
    fontFamily: authFonts.bold,
  },
  subtitle: {
    color: authColors.textMuted,
    fontSize: 15,
    fontFamily: authFonts.regular,
    marginTop: 8,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: authColors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: authColors.surfaceStrong,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    color: authColors.textSoft,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  loginButton: {
    backgroundColor: authColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: authColors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: authFonts.bold,
    letterSpacing: 0.3,
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  signUpText: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  signUpLink: {
    color: authColors.accentSoft,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
});
