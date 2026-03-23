import React from 'react';
import { View, StyleSheet } from 'react-native';
import { authColors } from '../../theme/authTheme';

export default function AuthBackground({ children }) {
  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />
        <View style={[styles.floatingCard, styles.cardOne]} />
        <View style={[styles.floatingCard, styles.cardTwo]} />
        <View style={[styles.floatingCard, styles.cardThree]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: authColors.glowPrimary,
  },
  glowTop: {
    top: -80,
    left: -40,
  },
  glowBottom: {
    bottom: -90,
    right: -30,
    backgroundColor: authColors.glowSecondary,
  },
  floatingCard: {
    position: 'absolute',
    width: 170,
    height: 110,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardOne: {
    top: 90,
    right: -15,
    transform: [{ rotate: '12deg' }],
  },
  cardTwo: {
    top: 220,
    left: -20,
    transform: [{ rotate: '-6deg' }],
  },
  cardThree: {
    bottom: 140,
    right: 20,
    transform: [{ rotate: '4deg' }],
  },
});
