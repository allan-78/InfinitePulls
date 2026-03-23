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

const ROLE_OPTIONS = [
  {
    value: "user",
    label: "Store User",
    icon: "person",
    hint: "Can browse packs, place orders, and manage their own profile.",
  },
  {
    value: "admin",
    label: "Administrator",
    icon: "admin-panel-settings",
    hint: "Can manage listings, users, reviews, orders, and promotions.",
  },
];

const UpdateUserScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState("user");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

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
      setSelectedRole(response.data.user.role);
    } catch (error) {
      console.error("Error fetching user details:", error);
      Alert.alert("Error", "Failed to load user details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleMeta =
    ROLE_OPTIONS.find((option) => option.value === selectedRole) ||
    ROLE_OPTIONS[0];

  const currentRoleMeta =
    ROLE_OPTIONS.find((option) => option.value === user?.role) ||
    ROLE_OPTIONS[0];

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

  const handleUpdateRole = async () => {
    setUpdating(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/users/role/${userId}`,
        { role: selectedRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser((currentUser) =>
        currentUser ? { ...currentUser, role: selectedRole } : currentUser
      );
      setConfirmVisible(false);
      setSuccessVisible(true);
    } catch (error) {
      console.error("Error updating user role:", error);
      setConfirmVisible(false);
      Alert.alert("Error", "Failed to update user role");
    } finally {
      setUpdating(false);
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

  const openConfirm = () => {
    if (!user || selectedRole === user.role) {
      Alert.alert("No Changes", "Role is already set to this value.");
      return;
    }
    setConfirmVisible(true);
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={18} color={adminColors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.heroTop}>
            {user.avatar?.url ? (
              <Image source={{ uri: user.avatar.url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Role Manager</Text>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>

              <View style={styles.statusRow}>
                <Badge label={user.isActive ? "Active" : "Inactive"} />
                <Badge
                  label={user.isVerified ? "Verified" : "Pending"}
                  accent="sparkle"
                />
                <Badge
                  label={user.role === "admin" ? "Admin" : "User"}
                  accent={user.role === "admin" ? "accent" : "default"}
                />
              </View>
            </View>
          </View>

          <View style={styles.snapshotGrid}>
            <SnapshotCard
              label="Current Access"
              value={currentRoleMeta.label}
            />
            <SnapshotCard
              label="Contact"
              value={user.contact || "No contact"}
            />
            <SnapshotCard label="Address" value={addressLine} multiline />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Assign user access</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the account role that best fits this user.
              </Text>
            </View>
            <View style={styles.sectionIcon}>
              <Icon
                name="manage-accounts"
                size={18}
                color={adminColors.accentSoft}
              />
            </View>
          </View>

          <View style={styles.roleOptions}>
            {ROLE_OPTIONS.map((option) => {
              const active = selectedRole === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                  onPress={() => setSelectedRole(option.value)}
                >
                  <View
                    style={[
                      styles.roleIconWrap,
                      active && styles.roleIconWrapActive,
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={20}
                      color={
                        active ? adminColors.darkText : adminColors.accentSoft
                      }
                    />
                  </View>

                  <View style={styles.roleCardCopy}>
                    <View style={styles.roleCardTitleRow}>
                      <Text
                        style={[
                          styles.roleCardTitle,
                          active && styles.roleCardTitleActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {active ? (
                        <Icon
                          name="check-circle"
                          size={18}
                          color={adminColors.sparkle}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.roleCardHint,
                        active && styles.roleCardHintActive,
                      ]}
                    >
                      {option.hint}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Change summary</Text>
          <View style={styles.summaryRow}>
            <SummaryPill label="Current" value={currentRoleMeta.label} />
            <Icon
              name="east"
              size={18}
              color={adminColors.textMuted}
              style={styles.summaryArrow}
            />
            <SummaryPill
              label="Selected"
              value={selectedRoleMeta.label}
              active
            />
          </View>

          <View style={styles.noticeCard}>
            <Icon name="info-outline" size={18} color={adminColors.sparkle} />
            <Text style={styles.noticeText}>
              Changing a user to admin grants access to catalog management,
              order control, reviews, and other protected admin screens.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              selectedRole === user.role && styles.primaryButtonDisabled,
            ]}
            onPress={openConfirm}
            disabled={selectedRole === user.role}
          >
            <Icon name="verified-user" size={17} color={adminColors.darkText} />
            <Text style={styles.primaryButtonText}>Update Role</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={confirmVisible}
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Icon
                name="admin-panel-settings"
                size={22}
                color={adminColors.darkText}
              />
            </View>
            <Text style={styles.modalTitle}>Confirm role update</Text>
            <Text style={styles.modalText}>
              {user.name} will move from {currentRoleMeta.label.toLowerCase()}{" "}
              to {selectedRoleMeta.label.toLowerCase()}.
            </Text>

            <View style={styles.confirmSummary}>
              <SummaryPill label="Current" value={currentRoleMeta.label} />
              <SummaryPill label="Next" value={selectedRoleMeta.label} active />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setConfirmVisible(false)}
                disabled={updating}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleUpdateRole}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color={adminColors.darkText} />
                ) : (
                  <>
                    <Icon name="check" size={16} color={adminColors.darkText} />
                    <Text style={styles.modalPrimaryText}>Apply</Text>
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
        visible={successVisible}
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, styles.successIconWrap]}>
              <Icon
                name="check-circle"
                size={24}
                color={adminColors.darkText}
              />
            </View>
            <Text style={styles.modalTitle}>Role updated</Text>
            <Text style={styles.modalText}>
              {user.name} now has {selectedRoleMeta.label.toLowerCase()} access.
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setSuccessVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>Back to Users</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminDrawer>
  );
};

function Badge({ label, accent = "default" }) {
  return (
    <View
      style={[
        styles.badge,
        accent === "accent" && styles.badgeAccent,
        accent === "sparkle" && styles.badgeSparkle,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          accent === "accent" && styles.badgeTextDark,
          accent === "sparkle" && styles.badgeTextSparkle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SnapshotCard({ label, value, multiline }) {
  return (
    <View style={[styles.snapshotCard, multiline && styles.snapshotCardWide]}>
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text
        style={[
          styles.snapshotValue,
          multiline && styles.snapshotValueMultiline,
        ]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

function SummaryPill({ label, value, active }) {
  return (
    <View style={[styles.summaryPill, active && styles.summaryPillActive]}>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryPillValue,
          active && styles.summaryPillValueActive,
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
    paddingBottom: 26,
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
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: adminColors.backgroundSoft,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 24,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
  },
  avatarFallbackText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 30,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  userName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 24,
  },
  userEmail: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: adminColors.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeAccent: {
    backgroundColor: adminColors.accentSoft,
  },
  badgeSparkle: {
    backgroundColor: "rgba(244, 226, 168, 0.12)",
  },
  badgeText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  badgeTextDark: {
    color: adminColors.darkText,
  },
  badgeTextSparkle: {
    color: adminColors.sparkle,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  snapshotCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    padding: 12,
  },
  snapshotCardWide: {
    flexBasis: "100%",
  },
  snapshotLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginBottom: 6,
  },
  snapshotValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
  },
  snapshotValueMultiline: {
    lineHeight: 18,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 17,
  },
  sectionSubtitle: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
  },
  roleOptions: {
    gap: 10,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    backgroundColor: adminColors.backgroundSoft,
    padding: 14,
  },
  roleCardActive: {
    borderColor: adminColors.accentSoft,
    backgroundColor: "rgba(240, 154, 134, 0.12)",
  },
  roleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panel,
  },
  roleIconWrapActive: {
    backgroundColor: adminColors.accentSoft,
  },
  roleCardCopy: {
    flex: 1,
  },
  roleCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  roleCardTitle: {
    flex: 1,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  roleCardTitleActive: {
    color: adminColors.sparkle,
  },
  roleCardHint: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  roleCardHintActive: {
    color: adminColors.textSoft,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  summaryPillActive: {
    backgroundColor: "rgba(240, 154, 134, 0.16)",
    borderWidth: 1,
    borderColor: adminColors.accentSoft,
  },
  summaryPillLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginBottom: 5,
  },
  summaryPillValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
  },
  summaryPillValueActive: {
    color: adminColors.sparkle,
  },
  summaryArrow: {
    marginTop: 10,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    padding: 14,
  },
  noticeText: {
    flex: 1,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
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
    borderRadius: 18,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
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
    borderRadius: 18,
    backgroundColor: adminColors.accentSoft,
    paddingVertical: 15,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: adminColors.darkText,
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
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    marginBottom: 14,
  },
  successIconWrap: {
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
  confirmSummary: {
    gap: 10,
    marginTop: 16,
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
  modalPrimaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  successButton: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 14,
  },
  successButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});

export default UpdateUserScreen;
