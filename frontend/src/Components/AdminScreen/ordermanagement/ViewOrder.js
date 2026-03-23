import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function ViewOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${BACKEND_URL}/api/v1/admin/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrder(res.data.order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      Alert.alert("Error", "Failed to load order details");
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={adminColors.accentSoft} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
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

          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderCopy}>
              <Text style={styles.heroTitle}>Order #{order._id.slice(-8)}</Text>
              <Text style={styles.heroSubtitle}>
                {formatLongDate(order.createdAt)}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.orderStatus) },
              ]}
            >
              <Text style={styles.statusText}>{order.orderStatus}</Text>
            </View>
          </View>

          <View style={styles.heroMetrics}>
            <MetricCard label="Customer" value={order.user?.name || "N/A"} />
            <MetricCard
              label="Items"
              value={`${order.orderItems?.length || 0}`}
            />
            <MetricCard
              label="Total"
              value={`PHP ${Number(order.totalPrice || 0).toFixed(2)}`}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer and shipping</Text>
          <InfoRow
            icon="person"
            label="Customer"
            value={order.user?.name || "N/A"}
          />
          <InfoRow
            icon="email"
            label="Email"
            value={order.user?.email || "N/A"}
          />
          <InfoRow
            icon="phone"
            label="Phone"
            value={order.shippingInfo?.phoneNo || "No contact number"}
          />
          <InfoRow
            icon="location-on"
            label="Address"
            value={buildAddress(order)}
            multiline
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order items</Text>
          <View style={styles.itemList}>
            {(order.orderItems || []).map((item, index) => {
              const imageUri =
                item.image || item.product?.images?.[0]?.url || null;
              return (
                <View
                  key={`${item.product || item.name}-${index}`}
                  style={styles.itemCard}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Icon
                        name="image"
                        size={20}
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
                    <Text style={styles.itemSubtotal}>
                      PHP{" "}
                      {(
                        Number(item.price || 0) * Number(item.quantity || 0)
                      ).toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          <SummaryRow
            label="Items Price"
            value={`PHP ${Number(order.itemsPrice || 0).toFixed(2)}`}
          />
          <SummaryRow
            label="Shipping Price"
            value={`PHP ${Number(order.shippingPrice || 0).toFixed(2)}`}
          />
          <SummaryRow
            label="Tax Price"
            value={`PHP ${Number(order.taxPrice || 0).toFixed(2)}`}
          />
          <SummaryRow
            label="Payment Method"
            value={order.paymentMethod || "Cash on Delivery"}
          />
          <SummaryRow
            label="Payment Status"
            value={order.paymentInfo?.status === "paid" ? "Paid" : "Pending"}
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              PHP {Number(order.totalPrice || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => navigation.navigate("UpdateOrder", { order })}
        >
          <Icon name="update" size={18} color={adminColors.darkText} />
          <Text style={styles.updateButtonText}>Update Status</Text>
        </TouchableOpacity>
      </ScrollView>
    </AdminDrawer>
  );
}

function MetricCard({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
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

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const buildAddress = (order) => {
  const parts = [
    order.shippingInfo?.address,
    order.shippingInfo?.city,
    order.shippingInfo?.postalCode,
    order.shippingInfo?.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "No shipping address";
};

const getStatusColor = (status) => {
  switch (status) {
    case "Delivered":
      return adminColors.success;
    case "Out for Delivery":
      return "#D59D45";
    case "Processing":
      return adminColors.accentSoft;
    case "Accepted":
      return "#B6C37A";
    case "Cancelled":
      return adminColors.danger;
    default:
      return "#8A726C";
  }
};

const formatLongDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroHeaderCopy: {
    flex: 1,
    marginRight: 8,
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
    lineHeight: 19,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: 126,
  },
  statusText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
    textAlign: "center",
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: adminColors.backgroundSoft,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  metricValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
    textAlign: "center",
  },
  metricLabel: {
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
    minWidth: 118,
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
    lineHeight: 20,
  },
  itemList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: adminColors.panelElevated,
  },
  itemImageFallback: {
    width: 68,
    height: 68,
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
  itemSubtotal: {
    marginTop: 10,
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: adminColors.line,
  },
  summaryLabel: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
  },
  summaryValue: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: adminColors.surfaceBorder,
  },
  totalLabel: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  totalValue: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.bold,
    fontSize: 17,
  },
  updateButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: adminColors.accentSoft,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...adminShadow,
  },
  updateButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
});
