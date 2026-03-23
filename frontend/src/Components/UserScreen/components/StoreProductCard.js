import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { authColors, authFonts } from '../../../theme/authTheme';

const formatPrice = (value) => Number(value || 0).toFixed(2);

const StoreProductCard = ({
  product,
  compact = false,
  onPress,
  onAddToCart,
  onBuyNow,
  ratingValue = 0,
  ratingCount = 0,
  loadingRating = false,
}) => {
  const displayPrice = formatPrice(product.discountedPrice || product.price);
  const originalPrice = formatPrice(product.price);
  const categoryText = [product.category || 'Trading Card', product.condition]
    .filter(Boolean)
    .join(' · ');
  const ratingText =
    ratingCount > 0 ? `${Number(ratingValue || 0).toFixed(1)} rating` : 'New drop';
  const buyLabel = compact ? 'Buy' : 'Buy Now';

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      {/* ── Image ─────────────────────────────────────── */}
      {product.images?.[0]?.url ? (
        <Image
          source={{ uri: product.images[0].url }}
          style={[styles.image, compact && styles.imageCompact]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imageFallback, compact && styles.imageCompact]}>
          <Icon name="style" size={28} color={authColors.textMuted} />
        </View>
      )}

      {/* ── Sale badge (absolute over image) ──────────── */}
      {product.isOnSale && (
        <View style={styles.saleBadge}>
          <Text style={styles.saleBadgeText}>
            {product.discountPercentage ? `${product.discountPercentage}% OFF` : 'SALE'}
          </Text>
        </View>
      )}

      {/* ── Body ──────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Category */}
        <Text style={styles.category} numberOfLines={1}>
          {categoryText}
        </Text>

        {/* Name */}
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating + Stock */}
        <View style={[styles.infoRow, compact && styles.infoRowCompact]}>
          {loadingRating ? (
            <ActivityIndicator size="small" color={authColors.accent} />
          ) : (
            <View style={styles.ratingRow}>
              <Icon name="star" size={12} color={authColors.sparkle} />
              <Text style={styles.ratingText} numberOfLines={1}>
                {ratingText}
              </Text>
              {ratingCount > 0 && (
                <Text style={styles.reviewCount} numberOfLines={1}>
                  ({ratingCount})
                </Text>
              )}
            </View>
          )}

          <Text style={styles.stockText} numberOfLines={1}>
            {product.stock || 0} in stock
          </Text>
        </View>
      </View>

      {/* ── Footer ────────────────────────────────────── */}
      <View style={styles.footer}>
        {/* Price */}
        <View style={styles.priceRow}>
          {product.isOnSale && product.discountedPrice ? (
            <>
              <Text style={styles.originalPrice}>P{originalPrice}</Text>
              <Text style={styles.discountedPrice}>P{displayPrice}</Text>
            </>
          ) : (
            <Text style={styles.price}>P{displayPrice}</Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={onAddToCart}
            activeOpacity={0.82}
          >
            <Icon name="add-shopping-cart" size={14} color={authColors.accentSoft} />
            <Text style={styles.cartButtonText}>Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={onBuyNow}
            activeOpacity={0.82}
          >
            <Icon name="shopping-cart-checkout" size={14} color={authColors.textPrimary} />
            <Text style={styles.buyButtonText}>{buyLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Spacing tokens ────────────────────────────────────────────────────────────
const SPACE = { xs: 4, sm: 6, md: 10, lg: 12, xl: 16 };
const CARD_RADIUS = 20;
const BUTTON_RADIUS = 10;

const styles = StyleSheet.create({
  // ── Card shell ──────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  cardCompact: {
    width: 210,
  },

  // ── Image ───────────────────────────────────────────────────────────────────
  image: {
    width: '100%',
    height: 136,
    backgroundColor: authColors.surfaceStrong,
  },
  imageCompact: {
    height: 120,
  },
  imageFallback: {
    width: '100%',
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surfaceStrong,
  },

  // ── Sale badge (overlaid on image) ──────────────────────────────────────────
  saleBadge: {
    position: 'absolute',
    top: SPACE.md,
    right: SPACE.md,
    borderRadius: 8,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(199, 104, 91, 0.2)',
  },
  saleBadgeText: {
    color: authColors.accentSoft,
    fontSize: 9,
    fontFamily: authFonts.bold,
    letterSpacing: 0.4,
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.sm,
    gap: SPACE.xs,
  },

  category: {
    color: authColors.textMuted,
    fontSize: 10,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  name: {
    marginTop: 2,
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: authFonts.bold,
  },
  nameCompact: {
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Rating + Stock row ──────────────────────────────────────────────────────
  infoRow: {
    marginTop: SPACE.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.xs,
    minHeight: 18,
  },
  infoRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  ratingText: {
    marginLeft: 3,
    color: authColors.textMuted,
    fontSize: 10,
    fontFamily: authFonts.semibold,
    flexShrink: 1,
  },
  reviewCount: {
    marginLeft: 3,
    color: authColors.textMuted,
    fontSize: 10,
    fontFamily: authFonts.regular,
  },
  stockText: {
    color: authColors.textMuted,
    fontSize: 10,
    fontFamily: authFonts.regular,
    flexShrink: 0,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 154, 134, 0.1)',
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
  },

  // ── Price ───────────────────────────────────────────────────────────────────
  priceRow: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.sm,
    justifyContent: 'center',
    minHeight: 36,
  },
  originalPrice: {
    color: authColors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: authFonts.regular,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    color: authColors.accentSoft,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: authFonts.bold,
  },
  price: {
    color: authColors.accentSoft,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: authFonts.bold,
  },

  // ── Action buttons ──────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: SPACE.sm,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
  },
  cartButtonText: {
    fontSize: 11,
    color: authColors.accentSoft,
    fontFamily: authFonts.semibold,
  },
  buyButton: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: SPACE.sm,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: authColors.accent,
  },
  buyButtonText: {
    fontSize: 11,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
});

export default StoreProductCard;