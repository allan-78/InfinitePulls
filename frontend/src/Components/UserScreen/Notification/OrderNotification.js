import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authColors, authFonts } from '../../../theme/authTheme';
import { getToken } from '../../../utils/helper';
import {
  appendInAppNotification,
  clearStoredInAppNotifications,
  getBackendPushRegistrationStatus,
  getStoredInAppNotifications,
  getStoredDevicePushToken,
  normalizeStoredNotification,
  registerForPushNotificationsAsync,
  storeInAppNotifications,
} from '../../../hooks/usePushNotifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function OrderNotification() {
  const navigation = useNavigation();
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const notificationsRef = useRef([]);
  const lastHandledResponseIdRef = useRef(null);

  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [pushTokenSaved, setPushTokenSaved] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [promoFeed, setPromoFeed] = useState({ newDiscounts: [], endingSoonDiscounts: [] });
  const [pushDebugInfo, setPushDebugInfo] = useState({
    permissionStatus: 'unknown',
    localToken: null,
    backendToken: null,
    backendTokenSource: null,
    backendTokenCount: 0,
    matchedDeviceToken: false,
    appOwnership: Constants.appOwnership || 'standalone',
    applicationId: Application.applicationId || null,
  });

  const persistNotifications = useCallback(async (items) => {
    const normalized = await storeInAppNotifications(items);
    notificationsRef.current = normalized;
    setNotifications(normalized);
  }, []);

  const loadSavedNotifications = useCallback(async () => {
    const savedNotifications = await getStoredInAppNotifications();
    notificationsRef.current = savedNotifications;
    setNotifications(savedNotifications);
  }, []);

  const maskToken = useCallback((token) => {
    if (!token) return 'Not saved';
    if (token.length <= 26) return token;
    return `${token.slice(0, 16)}...${token.slice(-8)}`;
  }, []);

  const inferPushTokenStatus = useCallback(async () => {
    try {
      const authToken = await getToken();
      if (!authToken) {
        setPushTokenSaved(false);
        setPushDebugInfo((current) => ({
          ...current,
          permissionStatus: 'signed-out',
          localToken: null,
          backendToken: null,
          backendTokenSource: null,
          backendTokenCount: 0,
          matchedDeviceToken: false,
        }));
        return;
      }

      const [permissions, backendStatus, localToken] = await Promise.all([
        Notifications.getPermissionsAsync(),
        getBackendPushRegistrationStatus(),
        getStoredDevicePushToken(),
      ]);
      const matchedDeviceToken = Boolean(
        localToken &&
        (
          backendStatus.pushToken === localToken ||
          backendStatus.pushTokens.some((entry) => entry?.token === localToken)
        ),
      );

      setPushDebugInfo({
        permissionStatus: permissions.status,
        localToken,
        backendToken: backendStatus.pushToken,
        backendTokenSource: backendStatus.pushTokenSource,
        backendTokenCount: backendStatus.pushTokens.length,
        matchedDeviceToken,
        appOwnership: Constants.appOwnership || 'standalone',
        applicationId: Application.applicationId || null,
      });

      setPushTokenSaved(
        permissions.status === 'granted' &&
        Boolean(localToken) &&
        matchedDeviceToken &&
        backendStatus.saved,
      );
    } catch (error) {
      setPushTokenSaved(false);
    }
  }, []);

  const fetchPromoFeed = useCallback(async () => {
    const authToken = await getToken();
    if (!authToken) {
      setPromoFeed({ newDiscounts: [], endingSoonDiscounts: [] });
      return;
    }

    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/notifications/discounts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setPromoFeed(response.data?.notifications || { newDiscounts: [], endingSoonDiscounts: [] });
    } catch (error) {
      console.error('Promo feed error:', error.response?.data || error.message);
      setPromoFeed({ newDiscounts: [], endingSoonDiscounts: [] });
    }
  }, []);

  const handleNotificationOpen = useCallback((item) => {
    const data = item?.data || {};

    if (data.orderId) {
      navigation.navigate('OrderDetails', {
        orderId: data.orderId,
        fromNotification: true,
      });
      return;
    }

    if (data.productId) {
      navigation.navigate('MainApp', {
        screen: 'SingleProduct',
        params: {
          productId: data.productId,
          fromNotification: true,
        },
      });
    }
  }, [navigation]);

  const appendNotification = useCallback(async (incomingNotification) => {
    const updated = await appendInAppNotification(incomingNotification);
    notificationsRef.current = updated;
    setNotifications(updated);
  }, []);

  const initializeScreen = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSavedNotifications(),
        inferPushTokenStatus(),
        fetchPromoFeed(),
      ]);

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      const lastResponseId = lastResponse?.notification?.request?.identifier;
      if (lastResponse?.notification && lastResponseId && lastHandledResponseIdRef.current !== lastResponseId) {
        lastHandledResponseIdRef.current = lastResponseId;
        await appendNotification(lastResponse.notification);
      }
    } finally {
      setLoading(false);
    }
  }, [appendNotification, fetchPromoFeed, inferPushTokenStatus, loadSavedNotifications]);

  useEffect(() => {
    initializeScreen();

    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      await appendNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const normalized = normalizeStoredNotification(response.notification);
      await appendNotification(response.notification);
      handleNotificationOpen(normalized);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [appendNotification, handleNotificationOpen, initializeScreen]);

  useFocusEffect(
    useCallback(() => {
      fetchPromoFeed();
    }, [fetchPromoFeed])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeScreen();
    setRefreshing(false);
  }, [initializeScreen]);

  const handleEnableNotifications = useCallback(async () => {
    try {
      setRegistering(true);
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await inferPushTokenStatus();
        Alert.alert('Notifications Enabled', 'Your device is now ready for order and promo updates.');
      } else {
        await inferPushTokenStatus();
        Alert.alert('Setup Incomplete', 'Notification permission or token registration was not completed.');
      }
    } catch (error) {
      await inferPushTokenStatus();
      Alert.alert('Error', 'Failed to register this device for notifications.');
    } finally {
      setRegistering(false);
    }
  }, [inferPushTokenStatus]);

  const clearNotifications = useCallback(() => {
    Alert.alert('Clear Notifications', 'Remove all saved notification history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const cleared = await clearStoredInAppNotifications();
          notificationsRef.current = cleared;
          setNotifications(cleared);
        },
      },
    ]);
  }, []);

  const removeNotification = useCallback((id) => {
    Alert.alert('Delete Notification', 'Remove this notification from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await storeInAppNotifications(
            notifications.filter((item) => item.id !== id),
          );
          notificationsRef.current = updated;
          setNotifications(updated);
        },
      },
    ]);
  }, [notifications]);

  const formatRelativeDate = (value) => {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return authColors.success;
      case 'Cancelled':
        return authColors.danger;
      case 'Out for Delivery':
        return authColors.sparkle;
      case 'Accepted':
        return authColors.accentSoft;
      default:
        return authColors.textSoft;
    }
  };

  const orderNotifications = useMemo(
    () => notifications.filter((item) => item.data?.type === 'ORDER_STATUS_UPDATE' || item.data?.orderId),
    [notifications]
  );

  const promoNotifications = useMemo(
    () => notifications.filter((item) => item.data?.type === 'PROMO_DISCOUNT' || item.data?.type === 'discount' || item.data?.productId),
    [notifications]
  );

  const renderStatusCard = () => (
    <View style={styles.statusCard}>
      <View style={styles.statusIconWrap}>
        <Icon
          name={pushTokenSaved ? 'notifications-active' : 'notifications-off'}
          size={22}
          color={pushTokenSaved ? authColors.success : authColors.sparkle}
        />
      </View>
      <View style={styles.statusTextWrap}>
        <Text style={styles.statusTitle}>Push Updates</Text>
        <Text style={styles.statusSubtitle}>
          {pushTokenSaved
            ? 'This device is ready for promo and order notifications.'
            : 'Enable notifications to receive order status and discount alerts.'}
        </Text>
      </View>
      {!pushTokenSaved && (
        <TouchableOpacity
          style={[styles.enableButton, registering && styles.enableButtonDisabled]}
          onPress={handleEnableNotifications}
          disabled={registering}
          activeOpacity={0.82}
        >
          {registering ? (
            <ActivityIndicator size="small" color={authColors.textPrimary} />
          ) : (
            <Text style={styles.enableButtonText}>Enable</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDebugCard = () => (
    <View style={styles.debugCard}>
      <View style={styles.debugHeader}>
        <Icon name="bug-report" size={18} color={authColors.sparkle} />
        <Text style={styles.debugTitle}>Push Debug</Text>
      </View>
      <DebugRow label="App Mode" value={pushDebugInfo.appOwnership} />
      <DebugRow label="Permission" value={pushDebugInfo.permissionStatus} />
      <DebugRow label="Backend Source" value={pushDebugInfo.backendTokenSource || 'none'} />
      <DebugRow label="Backend Tokens" value={String(pushDebugInfo.backendTokenCount)} />
      <DebugRow label="APK Token Match" value={pushDebugInfo.matchedDeviceToken ? 'yes' : 'no'} />
      <DebugRow label="App ID" value={pushDebugInfo.applicationId || 'unknown'} />
      <DebugRow label="This Device Token" value={maskToken(pushDebugInfo.localToken)} multiline />
      <DebugRow label="Primary Backend Token" value={maskToken(pushDebugInfo.backendToken)} multiline />
    </View>
  );

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.noticeCard}
      onPress={() => handleNotificationOpen(item)}
      onLongPress={() => removeNotification(item.id)}
      activeOpacity={0.84}
    >
      <View style={[styles.noticeIconWrap, { backgroundColor: `${getOrderStatusColor(item.data?.status)}1F` }]}>
        <Icon name="local-shipping" size={22} color={getOrderStatusColor(item.data?.status)} />
      </View>
      <View style={styles.noticeContent}>
        <View style={styles.noticeHeader}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.noticeTime}>{formatRelativeDate(item.date)}</Text>
        </View>
        <Text style={styles.noticeBody}>{item.body}</Text>
        {item.data?.orderId ? (
          <View style={styles.noticeMetaPill}>
            <Icon name="receipt-long" size={13} color={authColors.textMuted} />
            <Text style={styles.noticeMetaText}>
              Order #{item.data.orderNumber || item.data.orderId.slice(-8)}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderPromoNoticeCard = ({ item }) => (
    <TouchableOpacity
      style={styles.noticeCard}
      onPress={() => handleNotificationOpen(item)}
      onLongPress={() => removeNotification(item.id)}
      activeOpacity={0.84}
    >
      <View style={[styles.noticeIconWrap, styles.promoIconWrap]}>
        <Icon name="local-offer" size={22} color={authColors.accentSoft} />
      </View>
      <View style={styles.noticeContent}>
        <View style={styles.noticeHeader}>
          <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.noticeTime}>{formatRelativeDate(item.date)}</Text>
        </View>
        <Text style={styles.noticeBody}>{item.body}</Text>
        {item.data?.productId ? (
          <View style={styles.noticeMetaPill}>
            <Icon name="inventory-2" size={13} color={authColors.textMuted} />
            <Text style={styles.noticeMetaText}>Open deal</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderPromoProductCard = ({ item, endingSoon = false }) => (
    <TouchableOpacity
      style={styles.promoProductCard}
      onPress={() => navigation.navigate('MainApp', {
        screen: 'SingleProduct',
        params: { productId: item._id },
      })}
      activeOpacity={0.86}
    >
      <Image source={{ uri: item.images?.[0]?.url }} style={styles.promoProductImage} />
      <View style={styles.promoProductBody}>
        <View style={styles.promoProductHeader}>
          <Text style={styles.promoProductName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{item.discountPercentage || 0}% OFF</Text>
          </View>
        </View>
        <Text style={styles.promoProductCategory}>{item.category} · {item.condition}</Text>
        <View style={styles.promoPriceRow}>
          <Text style={styles.originalPrice}>PHP {Number(item.price || 0).toFixed(2)}</Text>
          <Text style={styles.discountedPrice}>PHP {Number(item.discountedPrice || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.promoMetaRow}>
          <Icon name={endingSoon ? 'schedule' : 'campaign'} size={14} color={endingSoon ? authColors.sparkle : authColors.accentSoft} />
          <Text style={styles.promoMetaText}>
            {endingSoon ? 'Ending soon' : 'Freshly discounted'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPromoTab = () => {
    const hasPromoHistory = promoNotifications.length > 0;
    const hasPromoDeals = promoFeed.newDiscounts.length > 0 || promoFeed.endingSoonDiscounts.length > 0;

    if (!hasPromoHistory && !hasPromoDeals) {
      return (
        <View style={styles.emptyState}>
          <Icon name="local-offer" size={60} color={authColors.textMuted} />
          <Text style={styles.emptyTitle}>No promo alerts yet</Text>
          <Text style={styles.emptySubtitle}>When the admin activates a discount, promo alerts will show here.</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {hasPromoHistory ? (
          <>
            <Text style={styles.sectionTitle}>Saved Promo Alerts</Text>
            <FlatList
              data={promoNotifications}
              keyExtractor={(item) => item.id}
              renderItem={renderPromoNoticeCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.cardGap} />}
            />
          </>
        ) : null}

        {promoFeed.newDiscounts.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>New Discounts</Text>
            <FlatList
              data={promoFeed.newDiscounts}
              keyExtractor={(item) => `new-${item._id}`}
              renderItem={({ item }) => renderPromoProductCard({ item })}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.cardGap} />}
            />
          </>
        ) : null}

        {promoFeed.endingSoonDiscounts.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ending Soon</Text>
            <FlatList
              data={promoFeed.endingSoonDiscounts}
              keyExtractor={(item) => `ending-${item._id}`}
              renderItem={({ item }) => renderPromoProductCard({ item, endingSoon: true })}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.cardGap} />}
            />
          </>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={authColors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Icon name="arrow-back" size={22} color={authColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Orders, promos, and discount alerts</Text>
        </View>
        {notifications.length > 0 ? (
          <TouchableOpacity style={styles.clearButton} onPress={clearNotifications} activeOpacity={0.82}>
            <Icon name="delete-outline" size={22} color={authColors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        data={[{ key: activeTab }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View style={styles.content}>
            {renderStatusCard()}
            {renderDebugCard()}

            <View style={styles.tabSwitch}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.82}
              >
                <Text style={[styles.tabButtonText, activeTab === 'orders' && styles.tabButtonTextActive]}>
                  Order Updates
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'promos' && styles.tabButtonActive]}
                onPress={() => setActiveTab('promos')}
                activeOpacity={0.82}
              >
                <Text style={[styles.tabButtonText, activeTab === 'promos' && styles.tabButtonTextActive]}>
                  Promo Alerts
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'orders' ? (
              orderNotifications.length > 0 ? (
                <FlatList
                  data={orderNotifications}
                  keyExtractor={(item) => item.id}
                  renderItem={renderOrderCard}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                  contentContainerStyle={styles.tabContent}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="notifications-none" size={60} color={authColors.textMuted} />
                  <Text style={styles.emptyTitle}>No order updates yet</Text>
                  <Text style={styles.emptySubtitle}>Status changes like Delivered or Out for Delivery will appear here.</Text>
                </View>
              )
            ) : (
              renderPromoTab()
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[authColors.accent]}
            tintColor={authColors.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

function DebugRow({ label, value, multiline = false }) {
  return (
    <View style={[styles.debugRow, multiline && styles.debugRowStacked]}>
      <Text style={styles.debugLabel}>{label}</Text>
      <Text
        style={[styles.debugValue, multiline && styles.debugValueMultiline]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: authColors.panel,
    borderBottomWidth: 1,
    borderBottomColor: authColors.surfaceBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface,
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
  },
  headerSubtitle: {
    color: authColors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: authFonts.regular,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  debugCard: {
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  debugTitle: {
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.bold,
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  debugRowStacked: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 4,
  },
  debugLabel: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  debugValue: {
    flex: 1,
    textAlign: 'right',
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  debugValueMultiline: {
    textAlign: 'left',
    width: '100%',
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surfaceStrong,
    marginRight: 12,
  },
  statusTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  statusTitle: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
  statusSubtitle: {
    color: authColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    fontFamily: authFonts.regular,
  },
  enableButton: {
    backgroundColor: authColors.accent,
    borderRadius: 16,
    minWidth: 84,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  enableButtonDisabled: {
    opacity: 0.72,
  },
  enableButtonText: {
    color: authColors.textPrimary,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: authColors.surface,
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: authColors.accent,
  },
  tabButtonText: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
  tabButtonTextActive: {
    color: authColors.textPrimary,
  },
  tabContent: {
    gap: 14,
  },
  sectionTitle: {
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.bold,
    marginBottom: 10,
    marginTop: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 22,
    padding: 14,
  },
  noticeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143, 191, 122, 0.14)',
    marginRight: 12,
  },
  promoIconWrap: {
    backgroundColor: 'rgba(240, 154, 134, 0.16)',
  },
  noticeContent: {
    flex: 1,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noticeTitle: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.semibold,
    marginRight: 8,
  },
  noticeTime: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.regular,
  },
  noticeBody: {
    color: authColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: authFonts.regular,
  },
  noticeMetaPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: authColors.surfaceStrong,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  noticeMetaText: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.semibold,
  },
  promoProductCard: {
    flexDirection: 'row',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 22,
    overflow: 'hidden',
  },
  promoProductImage: {
    width: 96,
    height: 120,
    backgroundColor: authColors.surfaceStrong,
  },
  promoProductBody: {
    flex: 1,
    padding: 14,
  },
  promoProductHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  promoProductName: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: authFonts.semibold,
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: 'rgba(240, 154, 134, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountBadgeText: {
    color: authColors.accentSoft,
    fontSize: 11,
    fontFamily: authFonts.bold,
  },
  promoProductCategory: {
    color: authColors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: authFonts.regular,
  },
  promoPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  originalPrice: {
    color: authColors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    fontFamily: authFonts.regular,
  },
  discountedPrice: {
    color: authColors.accentSoft,
    fontSize: 17,
    fontFamily: authFonts.bold,
  },
  promoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoMetaText: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.semibold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 52,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    marginTop: 14,
    fontFamily: authFonts.bold,
  },
  emptySubtitle: {
    color: authColors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: authFonts.regular,
  },
  cardGap: {
    height: 12,
  },
});
