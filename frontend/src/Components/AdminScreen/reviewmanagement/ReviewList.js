import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import axios from "axios";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { getToken } from "../../../utils/helper";
import AdminDrawer from "../AdminDrawer";
import { adminColors, adminFonts, adminShadow } from "../adminTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const getReviewerAvatar = (review) =>
  review?.userAvatar || review?.userProfile?.avatar?.url || null;

const getReviewerName = (review) =>
  review?.user || review?.userProfile?.name || "Anonymous";

const getReviewerEmail = (review) =>
  review?.userEmail || review?.userProfile?.email || "No email";

const getReviewerContact = (review) =>
  review?.userContact || review?.userProfile?.contact || "";

export default function ReviewListScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState("all");
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(res.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      Alert.alert("Error", "Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.productName?.toLowerCase().includes(query) ||
          review.user?.toLowerCase().includes(query) ||
          review.comment?.toLowerCase().includes(query),
      );
    }
    if (selectedRating !== "all") {
      filtered = filtered.filter(
        (review) => review.rating === parseInt(selectedRating, 10),
      );
    }
    return filtered;
  }, [reviews, searchQuery, selectedRating]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleDelete = (review) => {
    setSelectedReview(review);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedReview) return;

    setDeleteLoading(true);
    try {
      const token = await getToken();
      await axios.delete(
        `${BACKEND_URL}/api/v1/admin/reviews/delete/${selectedReview._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setDeleteModalVisible(false);
      setDeleteSuccessVisible(true);
      fetchReviews();
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete review",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          const { logout } = await import("../../../utils/helper");
          await logout();
        },
        style: "destructive",
      },
    ]);
  };

  const renderRightActions = (review) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(review)}
      >
        <Icon name="delete" size={20} color={adminColors.textPrimary} />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const reviewerAvatar = getReviewerAvatar(item);
    const reviewerName = getReviewerName(item);
    const reviewerEmail = getReviewerEmail(item);
    const reviewerContact = getReviewerContact(item);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("ViewReview", { reviewId: item._id })
          }
        >
          <View style={styles.cardHeader}>
            <View style={styles.productRow}>
              <Icon
                name="shopping-bag"
                size={18}
                color={adminColors.accentSoft}
              />
              <Text numberOfLines={1} style={styles.productName}>
                {item.productName || "Unknown Product"}
              </Text>
            </View>
            <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.userRow}>
            {reviewerAvatar ? (
              <Image
                source={{ uri: reviewerAvatar }}
                style={styles.userAvatarImage}
              />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {reviewerName ? reviewerName.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}
            <View style={styles.userCopy}>
              <Text style={styles.userName}>{reviewerName}</Text>
              <Text style={styles.userEmail}>{reviewerEmail}</Text>
              {!!reviewerContact && (
                <Text style={styles.userMeta}>{reviewerContact}</Text>
              )}
            </View>
            <Text style={styles.ratingValue}>{item.rating}.0</Text>
          </View>

          <View style={styles.ratingRow}>{renderStars(item.rating)}</View>
          <Text numberOfLines={2} style={styles.comment}>
            {item.comment || "No comment provided"}
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Review moderation</Text>
          <Text style={styles.heroSubtitle}>
            {filteredReviews.length} reviews matching the current filters.
          </Text>
        </View>

        <View style={styles.searchShell}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color={adminColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product, collector, or review"
              placeholderTextColor={adminColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="close" size={18} color={adminColors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.ratingFilterRow}>
            {["all", "5", "4", "3", "2", "1"].map((rating) => {
              const selected = selectedRating === rating;
              return (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingChip,
                    selected && styles.ratingChipActive,
                  ]}
                  onPress={() => setSelectedRating(rating)}
                >
                  <Text
                    style={[
                      styles.ratingChipText,
                      selected && styles.ratingChipTextActive,
                    ]}
                  >
                    {rating === "all" ? "All" : `${rating}★`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filteredReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={adminColors.accentSoft}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="rate-review"
                size={72}
                color={adminColors.textMuted}
              />
              <Text style={styles.emptyText}>No reviews found</Text>
            </View>
          }
        />

        <Modal
          transparent
          animationType="fade"
          visible={deleteModalVisible}
          onRequestClose={() => {
            if (!deleteLoading) setDeleteModalVisible(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalDangerIcon}>
                <Icon name="delete" size={22} color={adminColors.danger} />
              </View>
              <Text style={styles.modalTitle}>Delete review</Text>
              <Text style={styles.modalText}>
                Remove the review by {selectedReview?.user || "this user"} for{" "}
                {selectedReview?.productName || "this product"}?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={deleteLoading}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDangerButton}
                  onPress={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator color={adminColors.textPrimary} />
                  ) : (
                    <Text style={styles.modalDangerText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={deleteSuccessVisible}
          onRequestClose={() => setDeleteSuccessVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalSuccessIcon}>
                <Icon
                  name="check-circle"
                  size={24}
                  color={adminColors.darkText}
                />
              </View>
              <Text style={styles.modalTitle}>Review deleted</Text>
              <Text style={styles.modalText}>
                The review has been removed from the moderation queue.
              </Text>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setDeleteSuccessVisible(false);
                  setSelectedReview(null);
                }}
              >
                <Text style={styles.modalPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AdminDrawer>
  );
}

const renderStars = (rating) => (
  <View style={styles.starsContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Icon
        key={star}
        name={star <= rating ? "star" : "star-border"}
        size={15}
        color={star <= rating ? adminColors.sparkle : adminColors.textMuted}
      />
    ))}
  </View>
);

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminColors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  heroTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 22,
  },
  heroSubtitle: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  searchShell: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: adminColors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  ratingFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ratingChip: {
    backgroundColor: adminColors.panel,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ratingChipActive: {
    backgroundColor: adminColors.accentSoft,
    borderColor: adminColors.accentSoft,
  },
  ratingChipText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  ratingChipTextActive: {
    color: adminColors.darkText,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  productName: {
    marginLeft: 8,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 15,
    flex: 1,
  },
  reviewDate: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accent,
    marginRight: 12,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: adminColors.backgroundSoft,
  },
  userAvatarText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  userCopy: {
    flex: 1,
  },
  userName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  userEmail: {
    marginTop: 2,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  userMeta: {
    marginTop: 2,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  ratingValue: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  ratingRow: {
    marginTop: 12,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  comment: {
    marginTop: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 12,
  },
  swipeButton: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: adminColors.danger,
  },
  deleteButtonText: {
    marginTop: 6,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 72,
  },
  emptyText: {
    marginTop: 12,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 9, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 22,
    ...adminShadow,
  },
  modalDangerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224, 122, 106, 0.14)",
    marginBottom: 14,
  },
  modalSuccessIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.sparkle,
    marginBottom: 14,
  },
  modalTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
  },
  modalText: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalSecondaryText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalDangerButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.danger,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalDangerText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  modalPrimaryButton: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
  },
  modalPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});
