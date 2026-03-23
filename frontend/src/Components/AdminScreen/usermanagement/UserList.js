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

const UserListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatusUser, setPendingStatusUser] = useState(null);
  const [statusSuccessVisible, setStatusSuccessVisible] = useState(false);
  const [statusSuccessPayload, setStatusSuccessPayload] = useState(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyUpdating, setVerifyUpdating] = useState(false);
  const [pendingVerifyUser, setPendingVerifyUser] = useState(null);
  const [verifySuccessVisible, setVerifySuccessVisible] = useState(false);
  const [verifySuccessPayload, setVerifySuccessPayload] = useState(null);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const admins = users.filter((user) => user.role === "admin").length;
    const verifiedUsers = users.filter((user) => user.isVerified).length;
    const inactiveUsers = users.length - activeUsers;
    return { activeUsers, admins, verifiedUsers, inactiveUsers };
  }, [users]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const confirmToggleStatus = async () => {
    if (!pendingStatusUser) return;

    setStatusUpdating(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/users/status/${pendingStatusUser._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchUsers();
      setStatusModalVisible(false);
      setStatusSuccessPayload({
        name: pendingStatusUser.name,
        avatar: pendingStatusUser.avatar?.url || null,
        isNowActive: !pendingStatusUser.isActive,
      });
      setStatusSuccessVisible(true);
      setPendingStatusUser(null);
    } catch (error) {
      Alert.alert("Error", "Failed to update user status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleToggleStatus = (user) => {
    setPendingStatusUser(user);
    setStatusModalVisible(true);
  };

  const handleVerifyPrompt = (user) => {
    setPendingVerifyUser(user);
    setVerifyModalVisible(true);
  };

  const confirmVerifyUser = async () => {
    if (!pendingVerifyUser) return;

    setVerifyUpdating(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/users/verify/${pendingVerifyUser._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchUsers();
      setVerifyModalVisible(false);
      setVerifySuccessPayload({
        name: pendingVerifyUser.name,
        avatar: pendingVerifyUser.avatar?.url || null,
      });
      setVerifySuccessVisible(true);
      setPendingVerifyUser(null);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to verify user"
      );
    } finally {
      setVerifyUpdating(false);
    }
  };

  const handleSoftDelete = async (userId) => {
    Alert.alert("Delete User", "Are you sure you want to archive this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${BACKEND_URL}/api/v1/users/${userId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchUsers();
            Alert.alert("Success", "User archived");
          } catch (error) {
            Alert.alert("Error", "Failed to delete user");
          }
        },
      },
    ]);
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

  const renderRightActions = (user) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => navigation.navigate("UpdateUser", { userId: user._id })}
      >
        <Icon name="edit" size={20} color={adminColors.darkText} />
        <Text style={styles.editButtonText}>Role</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleSoftDelete(user._id)}
      >
        <Icon name="archive" size={20} color={adminColors.textPrimary} />
        <Text style={styles.deleteButtonText}>Archive</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const hasAvatar = Boolean(item.avatar?.url);
    const avatarUri = item.avatar?.url || null;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <View style={styles.queueCard}>
          <TouchableOpacity
            style={styles.queueMain}
            onPress={() =>
              navigation.navigate("ViewUser", { userId: item._id })
            }
          >
            <View style={styles.identityBlock}>
              {hasAvatar ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    item.role === "admin"
                      ? styles.avatarFallbackAdmin
                      : styles.avatarFallbackUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarFallbackText,
                      item.role === "admin" && styles.avatarFallbackTextDark,
                    ]}
                  >
                    {item.name?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}

              <View style={styles.identityCopy}>
                <View style={styles.identityTopRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.rolePill,
                      item.role === "admin"
                        ? styles.rolePillAdmin
                        : styles.rolePillUser,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rolePillText,
                        item.role === "admin" && styles.rolePillTextDark,
                      ]}
                    >
                      {item.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>

                <View style={styles.metaStrip}>
                  <StatusPill
                    label={item.isActive ? "Active" : "Inactive"}
                    color={
                      item.isActive ? adminColors.success : adminColors.danger
                    }
                  />
                  <StatusPill
                    label={item.isVerified ? "Verified" : "Pending"}
                    color={
                      item.isVerified
                        ? adminColors.sparkle
                        : adminColors.textSoft
                    }
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.queueActions}>
            <InlineAction
              icon="visibility"
              label="Details"
              onPress={() =>
                navigation.navigate("ViewUser", { userId: item._id })
              }
            />
            <InlineAction
              icon="admin-panel-settings"
              label="Role"
              onPress={() =>
                navigation.navigate("UpdateUser", { userId: item._id })
              }
            />
            {!item.isVerified ? (
              <InlineAction
                icon="verified-user"
                label="Verify"
                onPress={() => handleVerifyPrompt(item)}
                accent="sparkle"
              />
            ) : null}
            <InlineAction
              icon={item.isActive ? "person-off" : "person"}
              label={item.isActive ? "Disable" : "Enable"}
              onPress={() => handleToggleStatus(item)}
              accent={item.isActive ? "danger" : "success"}
            />
          </View>
        </View>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <View style={styles.contentContainer}>
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={styles.controlHeaderCopy}>
              <Text style={styles.controlEyebrow}>Admin Queue</Text>
              <Text style={styles.controlTitle}>User control center</Text>
            </View>
            <View style={styles.controlBadge}>
              <Icon name="shield" size={16} color={adminColors.sparkle} />
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricIcon icon="groups" label="Total" value={users.length} />
            <MetricIcon
              icon="check-circle"
              label="Active"
              value={stats.activeUsers}
              accent="success"
            />
            <MetricIcon
              icon="block"
              label="Inactive"
              value={stats.inactiveUsers}
              accent="danger"
            />
            <MetricIcon
              icon="shield"
              label="Admins"
              value={stats.admins}
              accent="soft"
            />
            <MetricIcon
              icon="verified"
              label="Verified"
              value={stats.verifiedUsers}
              accent="sparkle"
            />
          </View>

          <View style={styles.headerActions}>
            <HeaderAction
              icon="person-add"
              label="Create"
              onPress={() => navigation.navigate("CreateUser")}
            />
            <HeaderAction
              icon="inventory-2"
              label="Archived"
              onPress={() => navigation.navigate("TrashUser")}
            />
            <HeaderAction icon="refresh" label="Refresh" onPress={fetchUsers} />
          </View>
        </View>

        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={adminColors.accentSoft}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="people-outline"
                size={72}
                color={adminColors.textMuted}
              />
              <Text style={styles.emptyTitle}>No users found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateUser")}
              >
                <Text style={styles.emptyButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={verifyModalVisible}
        onRequestClose={() => {
          if (!verifyUpdating) {
            setVerifyModalVisible(false);
            setPendingVerifyUser(null);
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
              This will mark {pendingVerifyUser?.name || "this user"} as
              verified and let them skip the pending verification state.
            </Text>

            {pendingVerifyUser ? (
              <View style={styles.modalUserRow}>
                {pendingVerifyUser.avatar?.url ? (
                  <Image
                    source={{ uri: pendingVerifyUser.avatar.url }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarFallback}>
                    <Text style={styles.modalAvatarFallbackText}>
                      {pendingVerifyUser.name?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}

                <View style={styles.modalUserCopy}>
                  <Text style={styles.modalUserName} numberOfLines={1}>
                    {pendingVerifyUser.name}
                  </Text>
                  <Text style={styles.modalUserEmail} numberOfLines={1}>
                    {pendingVerifyUser.email}
                  </Text>
                  <View style={styles.modalStatusPill}>
                    <Text style={styles.modalStatusPillText}>
                      Current:{" "}
                      {pendingVerifyUser.isVerified ? "Verified" : "Pending"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setVerifyModalVisible(false);
                  setPendingVerifyUser(null);
                }}
                disabled={verifyUpdating}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  styles.modalPrimaryButtonSparkle,
                ]}
                onPress={confirmVerifyUser}
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
        visible={statusModalVisible}
        onRequestClose={() => {
          if (!statusUpdating) {
            setStatusModalVisible(false);
            setPendingStatusUser(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconWrap,
                pendingStatusUser?.isActive
                  ? styles.modalIconDanger
                  : styles.modalIconSuccess,
              ]}
            >
              <Icon
                name={pendingStatusUser?.isActive ? "person-off" : "person-add"}
                size={22}
                color={
                  pendingStatusUser?.isActive
                    ? adminColors.danger
                    : adminColors.success
                }
              />
            </View>

            <Text style={styles.modalTitle}>
              {pendingStatusUser?.isActive ? "Disable user" : "Enable user"}
            </Text>
            <Text style={styles.modalText}>
              {pendingStatusUser?.name || "This user"} will{" "}
              {pendingStatusUser?.isActive
                ? "lose access to the app"
                : "regain access to the app"}{" "}
              until you change their status again.
            </Text>

            {pendingStatusUser ? (
              <View style={styles.modalUserRow}>
                {pendingStatusUser.avatar?.url ? (
                  <Image
                    source={{ uri: pendingStatusUser.avatar.url }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarFallback}>
                    <Text style={styles.modalAvatarFallbackText}>
                      {pendingStatusUser.name?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}

                <View style={styles.modalUserCopy}>
                  <Text style={styles.modalUserName} numberOfLines={1}>
                    {pendingStatusUser.name}
                  </Text>
                  <Text style={styles.modalUserEmail} numberOfLines={1}>
                    {pendingStatusUser.email}
                  </Text>
                  <View style={styles.modalStatusPill}>
                    <Text style={styles.modalStatusPillText}>
                      Current:{" "}
                      {pendingStatusUser.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setStatusModalVisible(false);
                  setPendingStatusUser(null);
                }}
                disabled={statusUpdating}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  pendingStatusUser?.isActive
                    ? styles.modalPrimaryButtonDanger
                    : styles.modalPrimaryButtonSuccess,
                ]}
                onPress={confirmToggleStatus}
                disabled={statusUpdating}
              >
                {statusUpdating ? (
                  <ActivityIndicator color={adminColors.textPrimary} />
                ) : (
                  <>
                    <Icon
                      name={
                        pendingStatusUser?.isActive ? "block" : "check-circle"
                      }
                      size={16}
                      color={adminColors.textPrimary}
                    />
                    <Text style={styles.modalPrimaryButtonText}>
                      {pendingStatusUser?.isActive ? "Disable" : "Enable"}
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
        onRequestClose={() => {
          setVerifySuccessVisible(false);
          setVerifySuccessPayload(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconSuccessSolid]}>
              <Icon name="verified" size={24} color={adminColors.darkText} />
            </View>

            <Text style={styles.modalTitle}>User verified</Text>
            <Text style={styles.modalText}>
              {verifySuccessPayload?.name || "The user"} is now marked as a
              verified account.
            </Text>

            <View style={styles.successUserRow}>
              {verifySuccessPayload?.avatar ? (
                <Image
                  source={{ uri: verifySuccessPayload.avatar }}
                  style={styles.modalAvatar}
                />
              ) : (
                <View style={styles.modalAvatarFallback}>
                  <Text style={styles.modalAvatarFallbackText}>
                    {verifySuccessPayload?.name?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}

              <View style={styles.modalUserCopy}>
                <Text style={styles.modalUserName} numberOfLines={1}>
                  {verifySuccessPayload?.name || "User"}
                </Text>
                <View
                  style={[
                    styles.successStatusPill,
                    styles.successStatusPillVerified,
                  ]}
                >
                  <Text style={styles.successStatusPillText}>
                    Verification approved
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successDoneButton}
              onPress={() => {
                setVerifySuccessVisible(false);
                setVerifySuccessPayload(null);
              }}
            >
              <Text style={styles.successDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={statusSuccessVisible}
        onRequestClose={() => {
          setStatusSuccessVisible(false);
          setStatusSuccessPayload(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconSuccessSolid]}>
              <Icon
                name="check-circle"
                size={24}
                color={adminColors.darkText}
              />
            </View>

            <Text style={styles.modalTitle}>Status updated</Text>
            <Text style={styles.modalText}>
              {statusSuccessPayload?.name || "The user"} is now{" "}
              {statusSuccessPayload?.isNowActive ? "active" : "inactive"}.
            </Text>

            <View style={styles.successUserRow}>
              {statusSuccessPayload?.avatar ? (
                <Image
                  source={{ uri: statusSuccessPayload.avatar }}
                  style={styles.modalAvatar}
                />
              ) : (
                <View style={styles.modalAvatarFallback}>
                  <Text style={styles.modalAvatarFallbackText}>
                    {statusSuccessPayload?.name?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}

              <View style={styles.modalUserCopy}>
                <Text style={styles.modalUserName} numberOfLines={1}>
                  {statusSuccessPayload?.name || "User"}
                </Text>
                <View
                  style={[
                    styles.successStatusPill,
                    statusSuccessPayload?.isNowActive
                      ? styles.successStatusPillActive
                      : styles.successStatusPillInactive,
                  ]}
                >
                  <Text style={styles.successStatusPillText}>
                    {statusSuccessPayload?.isNowActive
                      ? "Account enabled"
                      : "Account disabled"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successDoneButton}
              onPress={() => {
                setStatusSuccessVisible(false);
                setStatusSuccessPayload(null);
              }}
            >
              <Text style={styles.successDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminDrawer>
  );
};

function MetricIcon({ icon, label, value, accent = "primary" }) {
  return (
    <View style={styles.metricIconItem}>
      <View
        style={[
          styles.metricIconWrap,
          accent === "success" && styles.metricIconWrapSuccess,
          accent === "danger" && styles.metricIconWrapDanger,
          accent === "soft" && styles.metricIconWrapSoft,
          accent === "sparkle" && styles.metricIconWrapSparkle,
        ]}
      >
        <Icon
          name={icon}
          size={15}
          color={
            accent === "success"
              ? adminColors.success
              : accent === "danger"
              ? adminColors.danger
              : accent === "soft"
              ? adminColors.textSoft
              : accent === "sparkle"
              ? adminColors.sparkle
              : adminColors.accentSoft
          }
        />
        <Text
          style={[
            styles.metricIconValue,
            accent === "success" && styles.metricValueSuccess,
            accent === "danger" && styles.metricValueDanger,
            accent === "soft" && styles.metricValueSoft,
            accent === "sparkle" && styles.metricValueSparkle,
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={styles.metricIconLabel}>{label}</Text>
    </View>
  );
}

function HeaderAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.headerAction} onPress={onPress}>
      <Icon name={icon} size={15} color={adminColors.darkText} />
      <Text style={styles.headerActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ label, color }) {
  return (
    <View style={styles.statusPill}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function InlineAction({ icon, label, onPress, accent = "default" }) {
  return (
    <TouchableOpacity
      style={[
        styles.inlineAction,
        accent === "danger" && styles.inlineActionDanger,
        accent === "success" && styles.inlineActionSuccess,
        accent === "sparkle" && styles.inlineActionSparkle,
      ]}
      onPress={onPress}
    >
      <Icon
        name={icon}
        size={15}
        color={
          accent === "danger"
            ? adminColors.danger
            : accent === "success"
            ? adminColors.success
            : accent === "sparkle"
            ? adminColors.sparkle
            : adminColors.accentSoft
        }
      />
      <Text
        style={[
          styles.inlineActionText,
          accent === "danger" && styles.inlineActionTextDanger,
          accent === "success" && styles.inlineActionTextSuccess,
          accent === "sparkle" && styles.inlineActionTextSparkle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  controlCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  controlHeaderCopy: {
    flex: 1,
  },
  controlEyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  controlTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 19,
  },
  controlBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 12,
  },
  metricIconItem: {
    flex: 1,
    alignItems: "center",
  },
  metricIconWrap: {
    minWidth: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: adminColors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: 6,
  },
  metricIconWrapSuccess: {
    backgroundColor: "rgba(143, 191, 122, 0.12)",
  },
  metricIconWrapDanger: {
    backgroundColor: "rgba(224, 122, 106, 0.12)",
  },
  metricIconWrapSoft: {
    backgroundColor: "rgba(242, 184, 154, 0.12)",
  },
  metricIconWrapSparkle: {
    backgroundColor: "rgba(244, 226, 168, 0.12)",
  },
  metricIconValue: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 13,
  },
  metricValueSuccess: {
    color: adminColors.success,
  },
  metricValueDanger: {
    color: adminColors.danger,
  },
  metricValueSoft: {
    color: adminColors.textSoft,
  },
  metricValueSparkle: {
    color: adminColors.sparkle,
  },
  metricIconLabel: {
    marginTop: 5,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 10,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  headerAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerActionText: {
    marginLeft: 6,
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  queueCard: {
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    overflow: "hidden",
  },
  queueMain: {
    padding: 14,
  },
  identityBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
    marginRight: 14,
    backgroundColor: adminColors.backgroundSoft,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarFallbackAdmin: {
    backgroundColor: adminColors.accentSoft,
  },
  avatarFallbackUser: {
    backgroundColor: adminColors.panelSoft,
  },
  avatarFallbackText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 22,
  },
  avatarFallbackTextDark: {
    color: adminColors.darkText,
  },
  identityCopy: {
    flex: 1,
  },
  identityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    flex: 1,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rolePillAdmin: {
    backgroundColor: adminColors.accentSoft,
  },
  rolePillUser: {
    backgroundColor: adminColors.chip,
  },
  rolePillText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
  },
  rolePillTextDark: {
    color: adminColors.darkText,
  },
  userEmail: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  queueActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  inlineAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 14,
    paddingVertical: 10,
  },
  inlineActionDanger: {
    backgroundColor: "rgba(224, 122, 106, 0.12)",
  },
  inlineActionSuccess: {
    backgroundColor: "rgba(143, 191, 122, 0.12)",
  },
  inlineActionSparkle: {
    backgroundColor: "rgba(244, 226, 168, 0.18)",
  },
  inlineActionText: {
    marginLeft: 6,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  inlineActionTextDanger: {
    color: adminColors.danger,
  },
  inlineActionTextSuccess: {
    color: adminColors.success,
  },
  inlineActionTextSparkle: {
    color: adminColors.sparkle,
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
  editButton: {
    backgroundColor: adminColors.accentSoft,
  },
  deleteButton: {
    backgroundColor: adminColors.danger,
  },
  editButtonText: {
    marginTop: 6,
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
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
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    marginBottom: 20,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
  emptyButton: {
    backgroundColor: adminColors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
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
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalIconDanger: {
    backgroundColor: "rgba(224, 122, 106, 0.14)",
  },
  modalIconSuccess: {
    backgroundColor: "rgba(143, 191, 122, 0.14)",
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
  modalPrimaryButtonDanger: {
    backgroundColor: adminColors.danger,
  },
  modalPrimaryButtonSuccess: {
    backgroundColor: adminColors.success,
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
  successUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  successStatusPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  successStatusPillActive: {
    backgroundColor: "rgba(143, 191, 122, 0.16)",
  },
  successStatusPillInactive: {
    backgroundColor: "rgba(224, 122, 106, 0.14)",
  },
  successStatusPillVerified: {
    backgroundColor: "rgba(244, 226, 168, 0.18)",
  },
  successStatusPillText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
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

export default UserListScreen;
