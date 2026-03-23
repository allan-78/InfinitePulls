import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { getToken } from "../../../utils/helper";
import AdminDrawer from "../AdminDrawer";
import { adminColors, adminFonts, adminShadow } from "../adminTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ViewProductScreen({ navigation, route }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${BACKEND_URL}/api/v1/products/${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProduct(res.data.product);
      setReviews(res.data.product.reviews || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load card listing details");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const { logout } = await import("../../../utils/helper");
          await logout();
        },
      },
    ]);
  };

  const pricing = useMemo(() => {
    if (!product) {
      return { displayPrice: "0.00", originalPrice: null };
    }
    const saleActive = Boolean(product.isOnSale && product.discountedPrice);
    return {
      displayPrice: parseFloat(
        saleActive ? product.discountedPrice : product.price || 0
      ).toFixed(2),
      originalPrice: saleActive
        ? parseFloat(product.price || 0).toFixed(2)
        : null,
    };
  }, [product]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Card listing not found</Text>
      </View>
    );
  }

  const activeImage = product.images?.[imageIndex]?.url || null;

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.mediaFrame}>
            {activeImage ? (
              <Image source={{ uri: activeImage }} style={styles.mainImage} />
            ) : (
              <View style={styles.imageFallback}>
                <Icon name="style" size={38} color={adminColors.textMuted} />
                <Text style={styles.imageFallbackText}>No listing image</Text>
              </View>
            )}
          </View>

          {product.images?.length > 1 ? (
            <FlatList
              horizontal
              data={product.images}
              keyExtractor={(_, index) => `thumb-${index}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnailWrap,
                    index === imageIndex && styles.thumbnailWrapActive,
                  ]}
                  onPress={() => setImageIndex(index)}
                >
                  <Image source={{ uri: item.url }} style={styles.thumbnail} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.thumbnailList}
              showsHorizontalScrollIndicator={false}
            />
          ) : null}

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Listing Details</Text>
            <Text style={styles.title}>{product.name}</Text>

            <View style={styles.priceRow}>
              <View style={styles.priceBlock}>
                {pricing.originalPrice ? (
                  <View style={styles.oldPriceRow}>
                    <Text style={styles.originalPrice}>
                      PHP {pricing.originalPrice}
                    </Text>
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>
                        {product.discountPercentage
                          ? `${product.discountPercentage}% OFF`
                          : "SALE"}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Text style={styles.price}>PHP {pricing.displayPrice}</Text>
              </View>

              <View style={styles.ratingCard}>
                <Icon name="star" size={16} color={adminColors.sparkle} />
                <Text style={styles.ratingValue}>
                  {product.ratings?.toFixed(1) || "0.0"}
                </Text>
                <Text style={styles.ratingCount}>
                  {product.numOfReviews || 0} reviews
                </Text>
              </View>
            </View>

            <View style={styles.metaChips}>
              <MetaChip label={product.category || "Uncategorized"} />
              <MetaChip label={product.condition || "No condition"} />
              <MetaChip
                label={product.stock > 0 ? "In stock" : "Out of stock"}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Listing overview</Text>
          <InfoRow
            icon="inventory-2"
            label="Stock"
            value={`${product.stock || 0} units`}
          />
          <InfoRow
            icon="storefront"
            label="Seller"
            value={product.seller?.name || "Marketplace"}
          />
          <InfoRow
            icon="discount"
            label="Promotion"
            value={
              pricing.originalPrice
                ? `${product.discountPercentage || 0}% active discount`
                : "No active promotion"
            }
          />
          <InfoRow
            icon="calendar-today"
            label="Discount Window"
            value={
              product.discountStartDate && product.discountEndDate
                ? `${formatDate(product.discountStartDate)} to ${formatDate(
                    product.discountEndDate
                  )}`
                : "Not scheduled"
            }
            multiline
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {product.description || "No card description available."}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Collector reviews ({reviews.length})
          </Text>
          {reviews.length ? (
            reviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>
                    {review.user?.name || "Anonymous"}
                  </Text>
                  <View style={styles.reviewScore}>
                    <Icon name="star" size={14} color={adminColors.sparkle} />
                    <Text style={styles.reviewScoreText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyReviewText}>
              No collector reviews yet.
            </Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("UpdateProduct", { product })}
          >
            <Icon name="edit" size={16} color={adminColors.darkText} />
            <Text style={styles.primaryButtonText}>Edit Listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AdminDrawer>
  );
}

function MetaChip({ label }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, multiline }) {
  return (
    <View style={[styles.infoRow, multiline && styles.infoRowTop]}>
      <View style={styles.infoLabelWrap}>
        <Icon name={icon} size={16} color={adminColors.textSoft} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>
        {value}
      </Text>
    </View>
  );
}

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 26,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
  },
  emptyText: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    marginBottom: 14,
  },
  mediaFrame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: adminColors.backgroundSoft,
  },
  mainImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
    backgroundColor: adminColors.backgroundSoft,
  },
  imageFallback: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
  },
  imageFallbackText: {
    marginTop: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  thumbnailList: {
    paddingTop: 12,
    gap: 10,
  },
  thumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    padding: 3,
    backgroundColor: adminColors.backgroundSoft,
    marginRight: 10,
  },
  thumbnailWrapActive: {
    backgroundColor: adminColors.accentSoft,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  heroCopy: {
    marginTop: 16,
  },
  eyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 26,
    lineHeight: 34,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  priceBlock: {
    flex: 1,
  },
  oldPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  originalPrice: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  saleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: adminColors.accentSoft,
  },
  saleBadgeText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 11,
  },
  price: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 28,
  },
  ratingCard: {
    minWidth: 112,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  ratingValue: {
    marginTop: 5,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  ratingCount: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  metaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: adminColors.chip,
  },
  metaChipText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  sectionTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 17,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
  },
  infoRowTop: {
    alignItems: "flex-start",
  },
  infoLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 130,
  },
  infoLabel: {
    marginLeft: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  infoValueMultiline: {
    textAlign: "left",
    lineHeight: 19,
  },
  description: {
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  reviewCard: {
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  reviewName: {
    flex: 1,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  reviewScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewScoreText: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.bold,
    fontSize: 13,
  },
  reviewComment: {
    marginTop: 8,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  reviewDate: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  emptyReviewText: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 18,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});
