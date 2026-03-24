// CVPetShop/frontend/src/Components/UserScreen/Orders/OrderHistory.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getToken } from '../../../utils/helper';  // Changed: went up 3 levels
import UserDrawer from '../UserDrawer';  // Changed: went up 1 level then to UserDrawer
import { listMyOrders } from '../../../redux/actions/orderActions';
import { authColors, authFonts } from '../../../theme/authTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
// Status color mapping
const STATUS_COLORS = {
  'Processing': authColors.sparkle,
  'Shipped': authColors.textSoft,
  'Delivered': authColors.success,
  'Cancelled': authColors.danger,
  'Pending': authColors.sparkle,
  'Completed': authColors.success,
};

// ─── Order Item Component ───────────────────────────────────────────────────
const OrderItem = ({ item, onPress }) => {
  const statusColor = STATUS_COLORS[item.orderStatus] || authColors.textMuted;
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.7}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Icon name="shopping-bag" size={18} color={authColors.accentSoft} />
          <Text style={styles.orderId}>
            Order #{item.orderNumber || item._id.slice(-8).toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.orderStatus}
          </Text>
        </View>
      </View>

      {/* Order Items Preview */}
      <View style={styles.itemsPreview}>
        {item.orderItems.slice(0, 3).map((orderItem, index) => (
          <View key={index} style={styles.previewItem}>
            {orderItem.image ? (
              <Image source={{ uri: orderItem.image }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewImagePlaceholder}>
                <Icon name="image" size={16} color={authColors.textMuted} />
              </View>
            )}
          </View>
        ))}
        {item.orderItems.length > 3 && (
          <View style={styles.moreItemsBadge}>
            <Text style={styles.moreItemsText}>+{item.orderItems.length - 3}</Text>
          </View>
        )}
      </View>

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <View style={styles.orderFooterLeft}>
          <Icon name="calendar-today" size={14} color={authColors.textMuted} />
          <Text style={styles.orderDate}>{date}</Text>
        </View>
        <View style={styles.orderFooterRight}>
          <Text style={styles.orderTotalLabel}>Total: </Text>
          <Text style={styles.orderTotal}>₱{item.totalPrice?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty State Component ─────────────────────────────────────────────────
const EmptyState = ({ onShopNow }) => (
  <View style={styles.emptyContainer}>
    <Icon name="assignment" size={80} color={authColors.textMuted} />
    <Text style={styles.emptyTitle}>No Orders Yet</Text>
    <Text style={styles.emptySubtitle}>
      Looks like you haven't placed any orders. Start shopping to see your orders here!
    </Text>
    <TouchableOpacity style={styles.shopNowBtn} onPress={onShopNow}>
      <Icon name="storefront" size={20} color={authColors.textPrimary} />
      <Text style={styles.shopNowText}>Shop Now</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Order History Screen ─────────────────────────────────────────────
export default function OrderHistory({ navigation }) {
  const dispatch = useDispatch();

  const orderListMy = useSelector((state) => state.orderListMy);
  const { loading: loadingOrders, error, orders: reduxOrders } = orderListMy;

  // We fall back to [] if reduxOrders is undefined
  const orders = reduxOrders || [];

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All'); // All, Processing, Shipped, Delivered, Cancelled
  const [bottomNavScrollY, setBottomNavScrollY] = useState(0);

  useEffect(() => {
    fetchOrders();

    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      dispatch(listMyOrders());
    } catch (error) {
      console.error('Error in fetching orders wrapper:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetails', { orderId: order._id, order });
  };

  const handleShopNow = () => {
    navigation.navigate('Home');
  };

  // Filter orders based on selected filter
  const filteredOrders = filter === 'All'
    ? orders
    : orders.filter(order => order.orderStatus === filter);

  // Get unique statuses for filter buttons
  const statuses = ['All', ...new Set(orders.map(order => order.orderStatus))];

  // ─── Render Filter Button ────────────────────────────────────────────────
  const renderFilterButton = (status) => (
    <TouchableOpacity
      key={status}
      style={[
        styles.filterButton,
        filter === status && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === status && styles.filterButtonTextActive,
        ]}
      >
        {status}
      </Text>
    </TouchableOpacity>
  );

  // ─── Loading State ───────────────────────────────────────────────────────
  if (loadingOrders && !refreshing) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={authColors.accent} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer bottomNavScrollY={bottomNavScrollY}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Order History</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
            </Text>
          </View>

          {/* Filter Buttons */}
          {orders.length > 0 && (
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {statuses.map(renderFilterButton)}
              </ScrollView>
            </View>
          )}

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <OrderItem item={item} onPress={() => handleOrderPress(item)} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => setBottomNavScrollY(event.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[authColors.accent]}
                />
              }
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
          ) : (
            <EmptyState onShopNow={handleShopNow} />
          )}
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authColors.background,
  },
  loadingText: {
    fontSize: 15,
    color: authColors.textMuted,
    marginTop: 12,
    fontFamily: authFonts.regular,
  },

  // Header
  header: {
    backgroundColor: authColors.surface,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: authFonts.bold,
    color: authColors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },

  // Filter Buttons
  filterContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: authColors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  filterButtonActive: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  filterButtonText: {
    fontSize: 13,
    color: authColors.textMuted,
    fontFamily: authFonts.semibold,
  },
  filterButtonTextActive: {
    color: authColors.textPrimary,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Order Card
  orderCard: {
    backgroundColor: authColors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: authColors.brandShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    fontSize: 14,
    fontFamily: authFonts.semibold,
    color: authColors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: authFonts.semibold,
  },

  // Items Preview
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewItem: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: authColors.panelSoft,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authColors.panelSoft,
  },
  moreItemsBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreItemsText: {
    fontSize: 12,
    fontFamily: authFonts.semibold,
    color: authColors.textMuted,
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: authColors.surfaceBorder,
  },
  orderFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 12,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  orderFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 12,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  orderTotal: {
    fontSize: 14,
    fontFamily: authFonts.bold,
    color: authColors.accentSoft,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: -50,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: authFonts.bold,
    color: authColors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: authColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
    fontFamily: authFonts.regular,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.accent,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 25,
    marginTop: 10,
  },
  shopNowText: {
    fontSize: 15,
    fontFamily: authFonts.bold,
    color: authColors.textPrimary,
    marginLeft: 7,
  },
});
