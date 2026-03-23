import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

const ORDER_STATUSES = [
  { label: "Processing", value: "Processing", color: adminColors.accentSoft },
  { label: "Accepted", value: "Accepted", color: "#B6C37A" },
  { label: "Out for Delivery", value: "Out for Delivery", color: "#D59D45" },
  { label: "Delivered", value: "Delivered", color: adminColors.success },
  { label: "Cancelled", value: "Cancelled", color: adminColors.danger },
];

export default function UpdateOrderScreen({ route, navigation }) {
  const { order } = route.params;
  const [selectedStatus, setSelectedStatus] = useState(order.orderStatus);
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const previewItems = useMemo(
    () => order.orderItems || [],
    [order.orderItems]
  );

  const handleUpdateStatus = async () => {
    if (selectedStatus === order.orderStatus) {
      Alert.alert("Info", "No changes made to order status");
      return;
    }

    setConfirmVisible(true);
  };

  const submitStatusUpdate = async () => {
    try {
      setLoading(true);
      setConfirmVisible(false);
      const token = await getToken();

      await axios.put(
        `${BACKEND_URL}/api/v1/admin/orders/${order._id}`,
        { status: selectedStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessVisible(true);
    } catch (error) {
      console.error("Error updating order:", error);
      Alert.alert("Error", "Failed to update order status");
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

          <Text style={styles.heroTitle}>Update order status</Text>
          <Text style={styles.heroSubtitle}>
            Order #{order._id?.slice(-8) || "N/A"} • {order.user?.name || "N/A"}
          </Text>

          <View style={styles.heroMetaRow}>
            <StatusBadge
              label={`Current: ${order.orderStatus}`}
              color={getStatusColor(order.orderStatus)}
            />
            <Text style={styles.heroTotal}>
              PHP{" "}
              {Number(order.totalPrice || order.totalAmount || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items in this order</Text>
          <View style={styles.itemList}>
            {previewItems.slice(0, 3).map((item, index) => {
              const imageUri =
                item.image || item.product?.images?.[0]?.url || null;
              return (
                <View key={`${item.name}-${index}`} style={styles.itemRow}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Icon
                        name="image"
                        size={18}
                        color={adminColors.textMuted}
                      />
                    </View>
                  )}
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name || item.product?.name || "Product"}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Qty {item.quantity} • PHP{" "}
                      {Number(item.price || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select new status</Text>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownVisible(true)}
            disabled={loading}
          >
            <View style={styles.dropdownContent}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(selectedStatus) },
                ]}
              />
              <Text style={styles.dropdownText}>{selectedStatus}</Text>
            </View>
            <Icon
              name="arrow-drop-down"
              size={24}
              color={adminColors.textMuted}
            />
          </TouchableOpacity>

          {selectedStatus !== order.orderStatus && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>New status preview</Text>
              <StatusBadge
                label={selectedStatus}
                color={getStatusColor(selectedStatus)}
              />
            </View>
          )}

          <View style={styles.noteCard}>
            <Icon name="info" size={18} color={adminColors.accentSoft} />
            <Text style={styles.noteText}>
              Updating the order status sends a push notification directly to
              the buyer's phone.
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.updateButton,
              (selectedStatus === order.orderStatus || loading) &&
                styles.disabledButton,
            ]}
            onPress={handleUpdateStatus}
            disabled={selectedStatus === order.orderStatus || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={adminColors.darkText} />
            ) : (
              <>
                <Icon name="update" size={18} color={adminColors.darkText} />
                <Text style={styles.updateButtonText}>Update Status</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={dropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalGlow} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalEyebrow}>Order Flow</Text>
                  <Text style={styles.modalTitle}>Select status</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose the next fulfillment step for this order.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDropdownVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Icon
                    name="close"
                    size={20}
                    color={adminColors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.modalCurrentStatus}>
                <Text style={styles.modalCurrentLabel}>Current</Text>
                <StatusBadge
                  label={order.orderStatus}
                  color={getStatusColor(order.orderStatus)}
                />
              </View>
              <FlatList
                data={ORDER_STATUSES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      selectedStatus === item.value &&
                        styles.statusOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedStatus(item.value);
                      setDropdownVisible(false);
                    }}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View
                        style={[
                          styles.statusOptionIconWrap,
                          selectedStatus === item.value &&
                            styles.statusOptionIconWrapActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: item.color, marginRight: 0 },
                          ]}
                        />
                      </View>
                      <View style={styles.statusOptionCopy}>
                        <Text
                          style={[
                            styles.statusOptionText,
                            selectedStatus === item.value &&
                              styles.statusOptionTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.statusOptionHint}>
                          {getStatusHint(item.value)}
                        </Text>
                      </View>
                    </View>
                    {selectedStatus === item.value && (
                      <Icon
                        name="check"
                        size={18}
                        color={adminColors.success}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={confirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !loading && setConfirmVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !loading && setConfirmVisible(false)}
          >
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <Icon name="update" size={24} color={adminColors.darkText} />
              </View>
              <Text style={styles.confirmTitle}>Confirm status update</Text>
              <Text style={styles.confirmDescription}>
                Change this order from {order.orderStatus} to {selectedStatus}?
              </Text>

              <View style={styles.confirmStatusRow}>
                <StatusBadge
                  label={order.orderStatus}
                  color={getStatusColor(order.orderStatus)}
                />
                <Icon
                  name="arrow-forward"
                  size={18}
                  color={adminColors.textMuted}
                />
                <StatusBadge
                  label={selectedStatus}
                  color={getStatusColor(selectedStatus)}
                />
              </View>

              <Text style={styles.confirmNote}>
                The buyer's phone notification will be triggered after
                confirmation.
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setConfirmVisible(false)}
                  disabled={loading}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmPrimaryButton}
                  onPress={submitStatusUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={adminColors.darkText}
                    />
                  ) : (
                    <Text style={styles.confirmPrimaryText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={successVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSuccessVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSuccessVisible(false)}
          >
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Icon name="check" size={28} color={adminColors.darkText} />
              </View>
              <Text style={styles.successTitle}>Status updated</Text>
              <Text style={styles.successDescription}>
                The order is now marked as {selectedStatus}. The buyer phone
                notification has been queued.
              </Text>

              <View style={styles.confirmStatusRow}>
                <StatusBadge
                  label={selectedStatus}
                  color={getStatusColor(selectedStatus)}
                />
              </View>

              <TouchableOpacity
                style={styles.successPrimaryButton}
                onPress={() => {
                  setSuccessVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.successPrimaryText}>Back to Orders</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </AdminDrawer>
  );
}

function StatusBadge({ label, color }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

const getStatusColor = (status) => {
  const statusObj = ORDER_STATUSES.find((item) => item.value === status);
  return statusObj?.color || "#8A726C";
};

const getStatusHint = (status) => {
  switch (status) {
    case "Processing":
      return "Order received and queued for review.";
    case "Accepted":
      return "Confirmed and ready for fulfillment.";
    case "Out for Delivery":
      return "Shipment is already on the way.";
    case "Delivered":
      return "Buyer has received the order.";
    case "Cancelled":
      return "Order is closed and will not proceed.";
    default:
      return "Update the order workflow.";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  contentContainer: {
    paddingBottom: 24,
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
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  heroTotal: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 16,
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
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  itemImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: adminColors.panelElevated,
  },
  itemImageFallback: {
    width: 58,
    height: 58,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: adminColors.panelElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  itemMeta: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 18,
    padding: 14,
    backgroundColor: adminColors.backgroundSoft,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  dropdownText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
    flex: 1,
  },
  previewContainer: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  noteCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    padding: 14,
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: adminColors.panelElevated,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  updateButton: {
    flex: 1,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    ...adminShadow,
  },
  updateButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: adminColors.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    overflow: "hidden",
  },
  modalGlow: {
    position: "absolute",
    top: -54,
    right: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: adminColors.glowPrimary,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.line,
  },
  modalHeaderCopy: {
    flex: 1,
    marginRight: 12,
  },
  modalEyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  modalTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  modalSubtitle: {
    marginTop: 6,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.backgroundSoft,
  },
  modalCurrentStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.line,
    backgroundColor: adminColors.backgroundSoft,
  },
  modalCurrentLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.line,
  },
  statusOptionActive: {
    backgroundColor: adminColors.backgroundSoft,
  },
  statusOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  statusOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.chip,
    marginRight: 10,
  },
  statusOptionIconWrapActive: {
    backgroundColor: "rgba(240, 154, 134, 0.18)",
  },
  statusOptionCopy: {
    flex: 1,
  },
  statusOptionText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.regular,
    fontSize: 14,
  },
  statusOptionTextActive: {
    fontFamily: adminFonts.semibold,
  },
  statusOptionHint: {
    marginTop: 3,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: adminColors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    overflow: "hidden",
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    marginBottom: 14,
  },
  confirmTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
    textAlign: "center",
  },
  confirmDescription: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  confirmStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  confirmNote: {
    marginTop: 16,
    color: adminColors.textSoft,
    fontFamily: adminFonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  confirmActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  confirmCancelText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  confirmPrimaryButton: {
    flex: 1,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  confirmPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  successCard: {
    width: "100%",
    backgroundColor: adminColors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  successIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.success,
    marginBottom: 14,
  },
  successTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 20,
    textAlign: "center",
  },
  successDescription: {
    marginTop: 8,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  successPrimaryButton: {
    width: "100%",
    marginTop: 20,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  successPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
});
