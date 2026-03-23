import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AuthBackground from './AuthBackground';
import { authColors, authFonts } from '../../theme/authTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getBackendUrl = () => {
    if (Platform.OS === 'android') {
      return BACKEND_URL.replace('localhost', '10.0.2.2');
    }
    return BACKEND_URL;
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const url = `${getBackendUrl()}/api/v1/users/forgot-password`;

    try {
      const response = await axios.post(url, { email });

      if (response.data.success) {
        setMessage(response.data.message || 'Password reset email sent successfully.');
      } else {
        setError(response.data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <Icon name="style" size={26} color={authColors.accentSoft} />
            <Text style={styles.brandText}>Card Store</Text>
          </View>

          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we will send a reset link.
          </Text>

          <View style={styles.formCard}>
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.inputRow}>
              <Icon name="email" size={20} color={authColors.accentSoft} />
              <TextInput
                placeholder="Your Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="rgba(243, 232, 255, 0.5)"
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back to Login</Text>
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
    paddingTop: Platform.OS === 'ios' ? 90 : 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 28,
    fontFamily: authFonts.bold,
  },
  subtitle: {
    color: authColors.textMuted,
    fontSize: 14,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: authColors.surfaceStrong,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  primaryButton: {
    backgroundColor: authColors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: authColors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: authFonts.bold,
    letterSpacing: 0.3,
  },
  backText: {
    color: authColors.textSoft,
    fontSize: 13,
    fontFamily: authFonts.regular,
    textAlign: 'center',
  },
  success: {
    color: authColors.success,
    fontSize: 12,
    fontFamily: authFonts.regular,
    marginBottom: 10,
  },
  error: {
    color: authColors.danger,
    fontSize: 12,
    fontFamily: authFonts.regular,
    marginBottom: 10,
  },
});
