import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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

const getReviewerAvatar = (review) =>
  review?.userAvatar || review?.userProfile?.avatar?.url || null;

const getReviewerName = (review) =>
  review?.user || review?.userProfile?.name || "Anonymous";

const getReviewerEmail = (review) =>
  review?.userEmail || review?.userProfile?.email || "No email provided";

const getReviewerContact = (review) =>
  review?.userContact || review?.userProfile?.contact || "";

const getReviewerRole = (review) =>
  review?.userRole || review?.userProfile?.role || "";

export default function ViewReview({ route, navigation }) {
  const { reviewId } = route.params;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const reviewerAvatar = getReviewerAvatar(review);
  const reviewerName = getReviewerName(review);
  const reviewerEmail = getReviewerEmail(review);
  const reviewerContact = getReviewerContact(review);
  const reviewerRole = getReviewerRole(review);

  useEffect(() => {
    fetchReviewDetails();
  }, [reviewId]);

  const fetchReviewDetails = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/admin/reviews/${reviewId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setReview(response.data.review);
      } else {
        setError("Failed to load review details");
      }
    } catch (fetchError) {
      console.error("Error fetching review details:", fetchError);
      setError(
        fetchError.response?.data?.message || "Failed to load review details",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!review) return;

    setDeleteLoading(true);
    try {
      const token = await getToken();
      await axios.delete(
        `${BACKEND_URL}/api/v1/admin/reviews/delete/${review._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setDeleteModalVisible(false);
      setDeleteSuccessVisible(true);
    } catch (deleteError) {
      console.error("Error deleting review:", deleteError);
      setDeleteModalVisible(false);
      setError(
        deleteError.response?.data?.message || "Failed to delete review",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderStars = (rating, size = 18) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name={star <= rating ? "star" : "star-border"}
          size={size}
          color={star <= rating ? adminColors.sparkle : adminColors.textMuted}
        />
      ))}
    </View>
  );

  if (loading) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={adminColors.accentSoft} />
          <Text style={styles.loadingText}>Loading review details...</Text>
        </View>
      </AdminDrawer>
    );
  }

  if (error || !review) {
    return (
      <AdminDrawer>
        <View style={styles.centered}>
          <View style={styles.errorIconWrap}>
            <Icon name="rate-review" size={36} color={adminColors.textMuted} />
          </View>
          <Text style={styles.errorTitle}>Review not found</Text>
          <Text style={styles.errorText}>
            {error || "The review is unavailable or has already been removed."}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to Reviews</Text>
          </TouchableOpacity>
        </View>
      </AdminDrawer>
    );
  }

  return (
    <AdminDrawer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>Review Moderation</Text>
          <Text style={styles.headerTitle}>Review details</Text>

          <View style={styles.productBand}>
            <View style={styles.productIconWrap}>
              <Icon
                name="shopping-bag"
                size={18}
                color={adminColors.accentSoft}
              />
            </View>
            <View style={styles.productCopy}>
              <Text style={styles.productName}>
                {review.productName || "Unknown Product"}
              </Text>
              <Text style={styles.productId}>
                Product ID: {review.productId || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Collector</Text>
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
              {reviewerContact ? (
                <Text style={styles.userMeta}>{reviewerContact}</Text>
              ) : null}
              {reviewerRole ? (
                <Text style={styles.userMeta}>
                  Role: {reviewerRole.toUpperCase()}
                </Text>
              ) : null}
              {review.userId ? (
                <Text style={styles.userId}>User ID: {review.userId}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Review content</Text>
          <View style={styles.ratingPanel}>
            {renderStars(review.rating)}
            <Text style={styles.ratingValue}>{review.rating}.0 / 5.0</Text>
          </View>

          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>Comment</Text>
            <Text style={styles.commentText}>
              {review.comment || "No comment provided"}
            </Text>
          </View>

          <InfoRow
            icon="event"
            label="Created"
            value={formatDate(review.createdAt)}
          />
          {review.updatedAt && review.updatedAt !== review.createdAt ? (
            <InfoRow
              icon="update"
              label="Updated"
              value={formatDate(review.updatedAt)}
            />
          ) : null}
          <InfoRow
            icon="verified"
            label="Status"
            value={review.isActive ? "Active" : "Deleted"}
            accent={review.isActive ? "success" : "danger"}
          />
        </View>

        <View style={styles.actionCard}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Icon name="delete" size={18} color={adminColors.textPrimary} />
            <Text style={styles.deleteButtonText}>Delete Review</Text>
          </TouchableOpacity>
        </View>

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
                Permanently remove the review by {review.user || "this user"}?
                This action cannot be undone.
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
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.modalPrimaryText}>Back to Reviews</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminDrawer>
  );
}

function InfoRow({ icon, label, value, accent }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        <Icon
          name={icon}
          size={16}
          color={
            accent === "success"
              ? adminColors.success
              : accent === "danger"
                ? adminColors.danger
                : adminColors.textSoft
          }
        />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.infoValue,
          accent === "success" && styles.infoValueSuccess,
          accent === "danger" && styles.infoValueDanger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  errorTitle: {
    marginTop: 16,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: adminColors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
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
  backIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    marginBottom: 14,
  },
  eyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 24,
  },
  productBand: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  productIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panel,
    marginRight: 12,
  },
  productCopy: {
    flex: 1,
  },
  productName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  productId: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
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
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.accentSoft,
    marginRight: 14,
  },
  userAvatarImage: {
    width: 58,
    height: 58,
    borderRadius: 20,
    marginRight: 14,
    backgroundColor: adminColors.backgroundSoft,
  },
  userAvatarText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 22,
  },
  userCopy: {
    flex: 1,
  },
  userName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  userEmail: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  userMeta: {
    marginTop: 3,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  userId: {
    marginTop: 3,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  ratingPanel: {
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    padding: 14,
    marginBottom: 14,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  ratingValue: {
    marginTop: 8,
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  commentCard: {
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    padding: 14,
    marginBottom: 14,
  },
  commentLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
    marginBottom: 8,
  },
  commentText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
  },
  infoLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
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
  infoValueSuccess: {
    color: adminColors.success,
    fontFamily: adminFonts.semibold,
  },
  infoValueDanger: {
    color: adminColors.danger,
    fontFamily: adminFonts.semibold,
  },
  actionCard: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: adminColors.danger,
    borderRadius: 18,
    paddingVertical: 15,
  },
  deleteButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 14,
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
