import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const ViewUserScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyUpdating, setVerifyUpdating] = useState(false);
  const [verifySuccessVisible, setVerifySuccessVisible] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user details:", error);
      Alert.alert("Error", "Failed to load user details");
      navigation.goBack();
    } finally {
      setLoading(false);
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

  const addressLine = useMemo(() => {
    if (!user) return "No address saved";
    const parts = [
      user.address?.street,
      user.address?.barangay,
      user.address?.city,
      user.address?.zipcode,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "No address saved";
  }, [user]);

  const handleArchive = () => {
    Alert.alert("Delete User", "Are you sure you want to archive this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${BACKEND_URL}/api/v1/users/${user._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert("Success", "User archived");
            navigation.goBack();
          } catch (error) {
            Alert.alert("Error", "Failed to delete user");
          }
        },
      },
    ]);
  };

  const handleVerifyUser = async () => {
    setVerifyUpdating(true);
    try {
      const token = await getToken();
      const response = await axios.patch(
        `${BACKEND_URL}/api/v1/users/verify/${user._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser(response.data.user || { ...user, isVerified: true });
      setVerifyModalVisible(false);
      setVerifySuccessVisible(true);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to verify user"
      );
    } finally {
      setVerifyUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.profileTop}>
            {user.avatar?.url ? (
              <Image
                source={{ uri: user.avatar.url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileFallbackText}>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}

            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.profileChips}>
                <InfoChip
                  label={user.role === "admin" ? "Admin" : "User"}
                  accent={user.role === "admin"}
                />
                <InfoChip
                  label={user.isVerified ? "Verified" : "Pending Verification"}
                />
                <InfoChip label={user.isActive ? "Active" : "Inactive"} />
              </View>
            </View>
          </View>

          <View style={styles.heroStats}>
            <StatCard label="Created" value={formatShortDate(user.createdAt)} />
            <StatCard
              label="Updated"
              value={formatShortDate(user.updatedAt || user.createdAt)}
            />
            <StatCard label="Phone" value={user.contact || "No contact"} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActionsRow}>
            <ActionButton
              icon="edit"
              label="Edit Role"
              onPress={() =>
                navigation.navigate("UpdateUser", { userId: user._id })
              }
            />
            <ActionButton
              icon="refresh"
              label="Refresh"
              onPress={fetchUserDetails}
            />
            {!user.isVerified ? (
              <ActionButton
                icon="verified-user"
                label="Verify"
                onPress={() => setVerifyModalVisible(true)}
                sparkle
              />
            ) : null}
            <ActionButton
              icon="delete"
              label="Archive"
              danger
              onPress={handleArchive}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile snapshot</Text>
          <InfoRow icon="badge" label="Role" value={user.role.toUpperCase()} />
          <InfoRow
            icon="mark-email-read"
            label="Verification"
            value={user.isVerified ? "Verified account" : "Not yet verified"}
          />
          <InfoRow
            icon="person"
            label="Status"
            value={user.isActive ? "Active access" : "Access disabled"}
          />
          <InfoRow
            icon="phone"
            label="Contact"
            value={user.contact || "No contact number"}
          />
          <InfoRow icon="home" label="Address" value={addressLine} multiline />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile photo</Text>
          <View style={styles.photoPanel}>
            {user.avatar?.url ? (
              <Image
                source={{ uri: user.avatar.url }}
                style={styles.photoPreview}
              />
            ) : (
              <View style={styles.photoFallback}>
                <Icon
                  name="image-not-supported"
                  size={34}
                  color={adminColors.textMuted}
                />
                <Text style={styles.photoFallbackText}>
                  No uploaded profile photo
                </Text>
              </View>
            )}
          </View>
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={verifyModalVisible}
          onRequestClose={() => {
            if (!verifyUpdating) {
              setVerifyModalVisible(false);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconWrap, styles.modalIconSparkle]}>
                <Icon
                  name="verified-user"
                  size={22}
                  color={adminColors.sparkle}
                />
              </View>

              <Text style={styles.modalTitle}>Verify user account</Text>
              <Text style={styles.modalText}>
                Mark {user.name} as verified so the account is cleared by admin
                approval.
              </Text>

              <View style={styles.modalUserRow}>
                {user.avatar?.url ? (
                  <Image
                    source={{ uri: user.avatar.url }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarFallback}>
                    <Text style={styles.modalAvatarFallbackText}>
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}

                <View style={styles.modalUserCopy}>
                  <Text style={styles.modalUserName}>{user.name}</Text>
                  <Text style={styles.modalUserEmail}>{user.email}</Text>
                  <View style={styles.modalStatusPill}>
                    <Text style={styles.modalStatusPillText}>
                      Current: Pending
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setVerifyModalVisible(false)}
                  disabled={verifyUpdating}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    styles.modalPrimaryButtonSparkle,
                  ]}
                  onPress={handleVerifyUser}
                  disabled={verifyUpdating}
                >
                  {verifyUpdating ? (
                    <ActivityIndicator color={adminColors.darkText} />
                  ) : (
                    <>
                      <Icon
                        name="verified"
                        size={16}
                        color={adminColors.darkText}
                      />
                      <Text
                        style={[
                          styles.modalPrimaryButtonText,
                          styles.modalPrimaryButtonTextDark,
                        ]}
                      >
                        Verify
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="fade"
          visible={verifySuccessVisible}
          onRequestClose={() => setVerifySuccessVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View
                style={[styles.modalIconWrap, styles.modalIconSuccessSolid]}
              >
                <Icon name="verified" size={24} color={adminColors.darkText} />
              </View>
              <Text style={styles.modalTitle}>User verified</Text>
              <Text style={styles.modalText}>
                {user.name} is now marked as a verified account.
              </Text>
              <TouchableOpacity
                style={styles.successDoneButton}
                onPress={() => setVerifySuccessVisible(false)}
              >
                <Text style={styles.successDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AdminDrawer>
  );
};

function InfoChip({ label, accent }) {
  return (
    <View style={[styles.infoChip, accent && styles.infoChipAccent]}>
      <Text style={[styles.infoChipText, accent && styles.infoChipTextDark]}>
        {label}
      </Text>
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({ icon, label, onPress, danger, sparkle }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        danger && styles.actionButtonDanger,
        sparkle && styles.actionButtonSparkle,
      ]}
      onPress={onPress}
    >
      <Icon
        name={icon}
        size={16}
        color={
          danger
            ? adminColors.textPrimary
            : sparkle
            ? adminColors.darkText
            : adminColors.darkText
        }
      />
      <Text
        style={[
          styles.actionButtonText,
          danger && styles.actionButtonTextDanger,
          sparkle && styles.actionButtonTextSparkle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value, multiline }) {
  return (
    <View style={[styles.infoRow, multiline && styles.infoRowTop]}>
      <View style={styles.infoRowLabel}>
        <Icon name={icon} size={16} color={adminColors.textSoft} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text
        style={[styles.infoValueText, multiline && styles.infoValueMultiline]}
      >
        {value}
      </Text>
    </View>
  );
}

const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
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
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 26,
    marginRight: 16,
    backgroundColor: adminColors.backgroundSoft,
  },
  profileFallback: {
    width: 90,
    height: 90,
    borderRadius: 26,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
  },
  profileFallbackText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 32,
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 24,
  },
  profileEmail: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  profileChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  infoChip: {
    backgroundColor: adminColors.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipAccent: {
    backgroundColor: adminColors.accentSoft,
  },
  infoChipText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  infoChipTextDark: {
    color: adminColors.darkText,
  },
  heroStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
    textAlign: "center",
  },
  statLabel: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
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
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  actionButtonDanger: {
    backgroundColor: adminColors.danger,
  },
  actionButtonSparkle: {
    backgroundColor: adminColors.sparkle,
  },
  actionButtonText: {
    marginLeft: 7,
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  actionButtonTextDanger: {
    color: adminColors.textPrimary,
  },
  actionButtonTextSparkle: {
    color: adminColors.darkText,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
    gap: 12,
  },
  infoRowTop: {
    alignItems: "flex-start",
  },
  infoRowLabel: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 118,
  },
  infoLabelText: {
    marginLeft: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  infoValueText: {
    flex: 1,
    textAlign: "right",
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  infoValueMultiline: {
    textAlign: "left",
    lineHeight: 20,
  },
  photoPanel: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 20,
    minHeight: 220,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  photoFallbackText: {
    marginTop: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
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
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalIconSparkle: {
    backgroundColor: "rgba(244, 226, 168, 0.16)",
  },
  modalIconSuccessSolid: {
    backgroundColor: adminColors.sparkle,
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
  modalUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: adminColors.panelSoft,
  },
  modalAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
  },
  modalAvatarFallbackText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 22,
  },
  modalUserCopy: {
    flex: 1,
  },
  modalUserName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  modalUserEmail: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  modalStatusPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: adminColors.chip,
  },
  modalStatusPillText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
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
  modalSecondaryButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalPrimaryButtonSparkle: {
    backgroundColor: adminColors.sparkle,
  },
  modalPrimaryButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  modalPrimaryButtonTextDark: {
    color: adminColors.darkText,
  },
  successDoneButton: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
  },
  successDoneButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});

export default ViewUserScreen;
