import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

export default function OrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const stats = useMemo(() => {
    const processing = orders.filter(
      (order) => order.orderStatus === "Processing"
    ).length;
    const delivered = orders.filter(
      (order) => order.orderStatus === "Delivered"
    ).length;
    const shipping = orders.filter((order) =>
      ["Accepted", "Out for Delivery"].includes(order.orderStatus)
    ).length;
    const cancelled = orders.filter(
      (order) => order.orderStatus === "Cancelled"
    ).length;

    return { processing, delivered, shipping, cancelled };
  }, [orders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleDelete = (order) => {
    Alert.alert("Delete Order", `Delete order #${order._id.slice(-6)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(
              `${BACKEND_URL}/api/v1/admin/orders/${order._id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            Alert.alert("Success", "Order deleted successfully");
            fetchOrders();
          } catch (error) {
            Alert.alert("Error", "Failed to delete order");
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

  const renderRightActions = (order) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.updateButton]}
        onPress={() => navigation.navigate("UpdateOrder", { order })}
      >
        <Icon name="update" size={20} color={adminColors.darkText} />
        <Text style={styles.updateButtonText}>Update</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleDelete(order)}
      >
        <Icon name="delete" size={20} color={adminColors.textPrimary} />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const heroImage =
      item.orderItems?.[0]?.image ||
      item.orderItems?.[0]?.product?.images?.[0]?.url ||
      null;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("ViewOrder", { orderId: item._id })
          }
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.orderId}>Order #{item._id.slice(-8)}</Text>
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.orderStatus) },
              ]}
            >
              <Text style={styles.statusText}>{item.orderStatus}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.previewWrap}>
              {heroImage ? (
                <Image
                  source={{ uri: heroImage }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.previewFallback}>
                  <Icon
                    name="inventory-2"
                    size={24}
                    color={adminColors.textMuted}
                  />
                </View>
              )}
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.customerName}>
                {item.user?.name || "N/A"}
              </Text>
              <Text style={styles.customerEmail} numberOfLines={1}>
                {item.user?.email || "N/A"}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {item.orderItems?.length || 0} item(s)
                </Text>
                <Text style={styles.metaText}>
                  PHP{" "}
                  {Number(item.totalPrice || item.totalAmount || 0).toFixed(2)}
                </Text>
              </View>

              <View style={styles.thumbRow}>
                {(item.orderItems || []).slice(0, 3).map((orderItem, index) => {
                  const imageUri =
                    orderItem.image ||
                    orderItem.product?.images?.[0]?.url ||
                    null;
                  return imageUri ? (
                    <Image
                      key={`${item._id}-${index}`}
                      source={{ uri: imageUri }}
                      style={styles.thumbImage}
                    />
                  ) : (
                    <View
                      key={`${item._id}-${index}`}
                      style={styles.thumbFallback}
                    >
                      <Icon
                        name="image"
                        size={14}
                        color={adminColors.textMuted}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
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
          <View style={styles.heroHeader}>
            <View style={styles.heroHeaderCopy}>
              <Text style={styles.heroEyebrow}>Admin Queue</Text>
              <Text style={styles.heroTitle}>Order queue</Text>
            </View>
            <View style={styles.heroBadge}>
              <Icon
                name="local-shipping"
                size={16}
                color={adminColors.sparkle}
              />
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricIcon
              icon="receipt-long"
              label="Total"
              value={orders.length}
            />
            <MetricIcon
              icon="autorenew"
              label="Processing"
              value={stats.processing}
              accent="accent"
            />
            <MetricIcon
              icon="local-shipping"
              label="Shipping"
              value={stats.shipping}
              accent="soft"
            />
            <MetricIcon
              icon="check-circle"
              label="Delivered"
              value={stats.delivered}
              accent="success"
            />
            <MetricIcon
              icon="cancel"
              label="Cancelled"
              value={stats.cancelled}
              accent="danger"
            />
          </View>
        </View>

        <FlatList
          data={orders}
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
                name="shopping-cart"
                size={72}
                color={adminColors.textMuted}
              />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      </View>
    </AdminDrawer>
  );
}

function MetricIcon({ icon, label, value, accent = "primary" }) {
  return (
    <View style={styles.metricIconItem}>
      <View
        style={[
          styles.metricIconWrap,
          accent === "success" && styles.metricIconWrapSuccess,
          accent === "danger" && styles.metricIconWrapDanger,
          accent === "soft" && styles.metricIconWrapSoft,
          accent === "accent" && styles.metricIconWrapAccent,
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
              : accent === "accent"
              ? adminColors.accentSoft
              : adminColors.sparkle
          }
        />
        <Text
          style={[
            styles.metricIconValue,
            accent === "success" && styles.metricValueSuccess,
            accent === "danger" && styles.metricValueDanger,
            accent === "soft" && styles.metricValueSoft,
            accent === "accent" && styles.metricValueAccent,
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={styles.metricIconLabel}>{label}</Text>
    </View>
  );
}

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
    padding: 14,
    borderRadius: 24,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroHeaderCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: adminColors.sparkle,
    fontFamily: adminFonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  heroTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 19,
  },
  heroBadge: {
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
  metricIconWrapAccent: {
    backgroundColor: "rgba(240, 154, 134, 0.12)",
  },
  metricIconValue: {
    color: adminColors.sparkle,
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
  metricValueAccent: {
    color: adminColors.accentSoft,
  },
  metricIconLabel: {
    marginTop: 5,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 10,
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
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  cardHeaderCopy: {
    flex: 1,
    marginRight: 8,
  },
  orderId: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  orderDate: {
    marginTop: 3,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 122,
    alignSelf: "flex-start",
  },
  statusText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
    textAlign: "center",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewWrap: {
    marginRight: 14,
  },
  previewImage: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
  },
  previewFallback: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 15,
  },
  customerEmail: {
    marginTop: 4,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metaText: {
    color: adminColors.textSoft,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  thumbRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 6,
  },
  thumbImage: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: adminColors.backgroundSoft,
  },
  thumbFallback: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: adminColors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
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
  updateButton: {
    backgroundColor: adminColors.accentSoft,
  },
  deleteButton: {
    backgroundColor: adminColors.danger,
  },
  updateButtonText: {
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
  },
  emptyText: {
    marginTop: 12,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 15,
  },
});
