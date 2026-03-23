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
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AuthBackground from "./AuthBackground";
import SocialAuthSection from "./SocialAuthSection";
import { authColors, authFonts } from "../../theme/authTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const apiUrl = `${BACKEND_URL}/api/v1/users/register`;
      const res = await axios.post(apiUrl, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert(
        "Success",
        "Registration successful! Please check your email for verification.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ],
      );
    } catch (error) {
      let errorMessage = "Registration failed";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <Icon name="style" size={26} color={authColors.accentSoft} />
            <Text style={styles.brandText}>Card Store</Text>
          </View>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join the vault and start collecting.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputRow, errors.name && styles.inputError]}>
                <Icon name="person" size={20} color={authColors.accentSoft} />
                <TextInput
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  style={styles.input}
                  placeholderTextColor="rgba(243, 232, 255, 0.5)"
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[styles.inputRow, errors.email && styles.inputError]}
              >
                <Icon name="email" size={20} color={authColors.accentSoft} />
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  placeholderTextColor="rgba(243, 232, 255, 0.5)"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[styles.inputRow, errors.password && styles.inputError]}
              >
                <Icon name="lock" size={20} color={authColors.accentSoft} />
                <TextInput
                  placeholder="Create a password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password)
                      setErrors({ ...errors, password: null });
                  }}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="rgba(243, 232, 255, 0.5)"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={authColors.accentSoft}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
              <Text style={styles.hintText}>Minimum 6 characters</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirm Password</Text>
              <View
                style={[
                  styles.inputRow,
                  errors.confirmPassword && styles.inputError,
                ]}
              >
                <Icon name="lock" size={20} color={authColors.accentSoft} />
                <TextInput
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: null });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.input, { flex: 1 }]}
                  placeholderTextColor="rgba(243, 232, 255, 0.5)"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon
                    name={showConfirmPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={authColors.accentSoft}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            <View style={styles.termsContainer}>
              <Icon
                name="info-outline"
                size={16}
                color={authColors.textMuted}
              />
              <Text style={styles.termsText}>
                By creating an account, you agree to our{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          <SocialAuthSection title="Or join with" />
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
    fontSize: 30,
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
  },
  inputWrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: authFonts.semibold,
    color: authColors.textMuted,
    marginBottom: 6,
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
  },
  input: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  inputError: {
    borderColor: authColors.danger,
  },
  errorText: {
    color: authColors.danger,
    fontSize: 12,
    fontFamily: authFonts.regular,
    marginTop: 6,
  },
  hintText: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.regular,
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
    gap: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.textMuted,
    lineHeight: 18,
  },
  termsLink: {
    color: authColors.accentSoft,
    fontFamily: authFonts.semibold,
  },
  registerButton: {
    backgroundColor: authColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: authColors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 16,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: authFonts.bold,
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  loginText: {
    fontSize: 13,
    fontFamily: authFonts.regular,
    color: authColors.textMuted,
  },
  loginLink: {
    fontSize: 13,
    fontFamily: authFonts.semibold,
    color: authColors.accentSoft,
  },
});
