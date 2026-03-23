import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import AuthBackground from './AuthBackground';
import { authColors, authFonts } from '../../theme/authTheme';

export default function Onboarding({ navigation }) {
  const handleContinue = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Login');
  };

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Icon name="style" size={28} color={authColors.accentSoft} />
          <Text style={styles.brandText}>Card Store</Text>
        </View>

        <Text style={styles.title}>Build your dream deck</Text>
        <Text style={styles.subtitle}>
          Discover premium drops, track your collection, and trade faster with a
          sleek vault made for card lovers.
        </Text>

        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Icon name="local-offer" size={22} color={authColors.textPrimary} />
            <Text style={styles.featureTitle}>Curated Drops</Text>
            <Text style={styles.featureText}>Limited pulls, always fresh.</Text>
          </View>
          <View style={styles.featureCard}>
            <Icon name="verified" size={22} color={authColors.textPrimary} />
            <Text style={styles.featureTitle}>Verified Cards</Text>
            <Text style={styles.featureText}>Confidence in every trade.</Text>
          </View>
          <View style={styles.featureCard}>
            <Icon name="auto-awesome" size={22} color={authColors.textPrimary} />
            <Text style={styles.featureTitle}>Smart Vault</Text>
            <Text style={styles.featureText}>Track value at a glance.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleContinue}>
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Platform.OS === 'ios' ? 90 : 70,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 26,
  },
  brandText: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.semibold,
    letterSpacing: 0.5,
  },
  title: {
    color: authColors.textPrimary,
    fontSize: 34,
    fontFamily: authFonts.bold,
    lineHeight: 40,
  },
  subtitle: {
    color: authColors.textMuted,
    fontSize: 15,
    fontFamily: authFonts.regular,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 28,
  },
  featureGrid: {
    gap: 14,
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: authColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  featureTitle: {
    color: authColors.textPrimary,
    fontSize: 16,
    fontFamily: authFonts.semibold,
    marginTop: 8,
  },
  featureText: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.regular,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: authColors.accent,
    borderRadius: 16,
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
    fontSize: 16,
    fontFamily: authFonts.bold,
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: authColors.textSoft,
    fontSize: 14,
    fontFamily: authFonts.regular,
    textAlign: 'center',
  },
});
