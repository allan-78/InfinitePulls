import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AuthBackground from './AuthBackground';
import { authColors, authFonts } from '../../theme/authTheme';

export default function AuthSuccessTransition({ userName }) {
  const firstName = userName ? userName.split(' ')[0] : 'Collector';

  return (
    <AuthBackground>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Icon name="check-circle" size={72} color={authColors.success} />
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Login Successful</Text>
          <Text style={styles.title}>Welcome back, {firstName}</Text>
          <Text style={styles.subtitle}>
            Your collection is ready. We're preparing your dashboard now.
          </Text>

          <View style={styles.statusRow}>
            <ActivityIndicator color={authColors.accentSoft} />
            <Text style={styles.statusText}>Syncing your account</Text>
          </View>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.28)',
    marginBottom: 24,
    shadowColor: authColors.success,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  card: {
    width: '100%',
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  eyebrow: {
    color: authColors.accentSoft,
    fontSize: 13,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    color: authColors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: authFonts.bold,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: authColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: authFonts.regular,
    textAlign: 'center',
  },
  statusRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: authColors.surfaceStrong,
  },
  statusText: {
    color: authColors.textSoft,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
});
