import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import UserDrawer from '../UserDrawer';
import { authColors, authFonts } from '../../../theme/authTheme';

export default function OrderSuccess({ route, navigation }) {
  const { order, orderId, orderNumber } = route.params || {};

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={[styles.floatingCard, styles.floatingCardOne]} />
          <View style={[styles.floatingCard, styles.floatingCardTwo]} />

          <View style={styles.heroCard}>
            <View style={styles.successBadge}>
              <Icon name="check-circle" size={56} color={authColors.textPrimary} />
            </View>

            <Text style={styles.eyebrow}>Order Complete</Text>
            <Text style={styles.title}>Order placed successfully</Text>
            <Text style={styles.subtitle}>
              Your pull is locked in. We have received your order and the next update will show in your order history.
            </Text>

            <View style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Order ID</Text>
                <Text style={styles.orderValue} numberOfLines={1}>
                  {orderId || order?._id || 'N/A'}
                </Text>
              </View>

              {orderNumber ? (
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Order Number</Text>
                  <Text style={styles.orderValue} numberOfLines={1}>
                    {orderNumber}
                  </Text>
                </View>
              ) : null}

              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Total</Text>
                <Text style={styles.orderTotal}>
                  PHP {order?.totalPrice?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>

            <View style={styles.noteCard}>
              <Icon name="local-shipping" size={18} color={authColors.accentSoft} />
              <Text style={styles.noteText}>
                Track status changes and delivery updates from your orders page.
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.84}
              >
                <Icon name="storefront" size={18} color={authColors.textPrimary} />
                <Text style={styles.primaryButtonText}>Continue Shopping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('OrderHistory')}
                activeOpacity={0.84}
              >
                <Icon name="receipt-long" size={18} color={authColors.accentSoft} />
                <Text style={styles.secondaryButtonText}>View My Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: authColors.background,
  },
  floatingCard: {
    position: 'absolute',
    width: 156,
    height: 96,
    borderRadius: 20,
    backgroundColor: 'rgba(199, 104, 91, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240, 154, 134, 0.12)',
  },
  floatingCardOne: {
    top: 82,
    right: -28,
    transform: [{ rotate: '11deg' }],
  },
  floatingCardTwo: {
    bottom: 82,
    left: -36,
    transform: [{ rotate: '-10deg' }],
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  successBadge: {
    width: 94,
    height: 94,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.accent,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  eyebrow: {
    color: authColors.sparkle,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
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
    fontSize: 14,
    lineHeight: 22,
    fontFamily: authFonts.regular,
    textAlign: 'center',
    marginBottom: 22,
  },
  orderCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(58, 43, 40, 0.78)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    gap: 12,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderLabel: {
    fontSize: 13,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  orderValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  orderTotal: {
    fontSize: 18,
    color: authColors.accentSoft,
    fontFamily: authFonts.bold,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: authColors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: authFonts.regular,
  },
  buttonGroup: {
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  secondaryButtonText: {
    color: authColors.accentSoft,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
});
