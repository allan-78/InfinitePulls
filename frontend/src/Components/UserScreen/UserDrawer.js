import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  CommonActions,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUser,
  logout,
  onAuthChange,
  setAppViewMode,
} from "../../utils/helper";
import { authColors, authFonts } from "../../theme/authTheme";

const DRAWER_WIDTH = 300;
const MAIN_TAB_ROUTES = ["Home", "Marketplace", "Profile", "OrderHistory"];

const UserDrawer = ({
  children,
  hideTopProfileButton = false,
  topBarRight = null,
  bottomNavScrollY = 0,
}) => {
  const navigation = useNavigation();
  const route = useRoute();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const tabBarOpacity = useRef(new Animated.Value(1)).current;
  const tabBarVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);

  const isMainTabRoute = MAIN_TAB_ROUTES.includes(route.name);

  const animateTabBar = useCallback(
    (visible) => {
      tabBarVisibleRef.current = visible;
      Animated.parallel([
        Animated.spring(tabBarTranslateY, {
          toValue: visible ? 0 : 120,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }),
        Animated.timing(tabBarOpacity, {
          toValue: visible ? 1 : 0,
          duration: visible ? 220 : 160,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [tabBarOpacity, tabBarTranslateY]
  );

  useEffect(() => {
    if (MAIN_TAB_ROUTES.includes(route.name)) {
      setActiveTab(route.name);
    }
  }, [route.name]);

  useEffect(() => {
    animateTabBar(isMainTabRoute);
  }, [animateTabBar, isMainTabRoute]);

  useEffect(() => {
    if (!isMainTabRoute) {
      lastScrollYRef.current = 0;
      return;
    }

    const currentY = Number(bottomNavScrollY) || 0;
    const previousY = lastScrollYRef.current;
    const delta = currentY - previousY;

    if (currentY <= 20) {
      if (!tabBarVisibleRef.current) {
        animateTabBar(true);
      }
    } else if (delta > 12 && tabBarVisibleRef.current) {
      animateTabBar(false);
    } else if (delta < -12 && !tabBarVisibleRef.current) {
      animateTabBar(true);
    }

    lastScrollYRef.current = currentY;
  }, [animateTabBar, bottomNavScrollY, isMainTabRoute]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange(() => {
      loadUserData();
    });
    return unsubscribe;
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [shellUser, storedProfile] = await Promise.all([
        getUser(),
        AsyncStorage.getItem("userData"),
      ]);
      const fullProfile = storedProfile ? JSON.parse(storedProfile) : null;
      setUser(fullProfile || shellUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const showDrawer = useCallback(() => {
    setDrawerVisible(true);
    loadUserData();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const hideDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const openLogoutModal = useCallback(() => {
    hideDrawer();
    setTimeout(() => setLogoutVisible(true), 150);
  }, [hideDrawer, navigation]);

  const closeLogoutModal = useCallback(() => {
    if (!loggingOut) {
      setLogoutVisible(false);
    }
  }, [loggingOut]);

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      await logout();
      setLogoutVisible(false);
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }, [navigation]);

  const handleNavigation = useCallback(
    (screenName) => {
      hideDrawer();
      setActiveTab(screenName);

      try {
        navigation.navigate(screenName);
      } catch (error) {
        console.log(`Navigation to ${screenName} failed:`, error);
        Alert.alert("Error", `Cannot navigate to ${screenName}`);
      }
    },
    [hideDrawer, navigation]
  );

  const handleSwitchToAdmin = useCallback(async () => {
    await setAppViewMode("admin");
    hideDrawer();
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainApp" }],
      })
    );
  }, [hideDrawer, navigation]);

  const drawerItems = [
    { id: "home", label: "Home", icon: "sparkles-outline", screen: "Home" },
    {
      id: "marketplace",
      label: "Marketplace",
      icon: "storefront-outline",
      screen: "Marketplace",
    },
    {
      id: "orders",
      label: "My Orders",
      icon: "receipt-outline",
      screen: "OrderHistory",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "person-circle-outline",
      screen: "Profile",
    },
    {
      id: "assistant",
      label: "AI Assistant",
      icon: "chatbubble-ellipses-outline",
      screen: "AIChatbot",
    },
    ...(user?.role === "admin"
      ? [
          {
            id: "adminmode",
            label: "Back to Admin",
            icon: "shield-outline",
            isAdminSwitch: true,
          },
        ]
      : []),
    { id: "logout", label: "Logout", icon: "log-out-outline", isLogout: true },
  ];

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: "home-outline",
      activeIcon: "home",
      screen: "Home",
    },
    {
      id: "orders",
      label: "Orders",
      icon: "receipt-outline",
      activeIcon: "receipt",
      screen: "OrderHistory",
    },
    {
      id: "marketplace",
      label: "Market",
      icon: "storefront-outline",
      activeIcon: "storefront",
      screen: "Marketplace",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "person-outline",
      activeIcon: "person",
      screen: "Profile",
    },
  ];

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.trim().split(" ");
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return names[0][0].toUpperCase();
  };

  const getAvatarUri = () => user?.avatar?.url || user?.avatar || null;
  const getUserRoleLabel = () =>
    user?.role === "admin" ? "Store Admin" : "Collector Profile";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar
        backgroundColor={authColors.background}
        barStyle="light-content"
      />

      <View style={styles.content}>
        <View style={styles.topBar}>
          {!hideTopProfileButton ? (
            <TouchableOpacity
              style={styles.profileTrigger}
              onPress={showDrawer}
              activeOpacity={0.85}
            >
              {getAvatarUri() ? (
                <Image
                  source={{ uri: getAvatarUri() }}
                  style={styles.profileTriggerAvatar}
                />
              ) : (
                <View style={styles.profileTriggerInner}>
                  <Text style={styles.profileTriggerText}>
                    {getUserInitials()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarSideSpacer} />
          )}

          <View style={styles.brandWrap}>
            <Text
              style={styles.brandName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              Infinite Pulls
            </Text>
          </View>

          {topBarRight ? (
            <View style={styles.topBarRight}>{topBarRight}</View>
          ) : (
            <View style={styles.topBarSideSpacer} />
          )}
        </View>

        <View style={styles.childContent}>{children}</View>

        {isMainTabRoute && (
          <View pointerEvents="box-none" style={styles.tabBarLayer}>
            <Animated.View
              style={[
                styles.tabBarWrap,
                {
                  opacity: tabBarOpacity,
                  transform: [{ translateY: tabBarTranslateY }],
                },
              ]}
              pointerEvents={tabBarVisibleRef.current ? "auto" : "none"}
            >
              <View style={styles.tabBar}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.screen;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={styles.tabItem}
                      onPress={() => handleNavigation(tab.screen)}
                      activeOpacity={0.82}
                    >
                      <View
                        style={[
                          styles.tabIconBubble,
                          isActive && styles.tabIconBubbleActive,
                        ]}
                      >
                        <Ionicons
                          name={isActive ? tab.activeIcon : tab.icon}
                          size={20}
                          color={
                            isActive
                              ? authColors.textPrimary
                              : authColors.textMuted
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.tabLabel,
                          isActive && styles.tabLabelActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      <Modal
        transparent
        visible={drawerVisible}
        onRequestClose={hideDrawer}
        animationType="none"
      >
        <TouchableWithoutFeedback onPress={hideDrawer}>
          <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.drawerContainer,
                  { transform: [{ translateX: slideAnim }] },
                ]}
              >
                <View
                  style={[styles.drawerFloatingCard, styles.drawerCardOne]}
                />
                <View
                  style={[styles.drawerFloatingCard, styles.drawerCardTwo]}
                />
                <View
                  style={[styles.drawerFloatingCard, styles.drawerCardThree]}
                />

                <View style={styles.drawerHeader}>
                  <View style={styles.drawerHeaderBadge}>
                    <Text style={styles.drawerHeaderEyebrow}>
                      {getUserRoleLabel()}
                    </Text>
                    <Text style={styles.drawerHeaderTitle}>Your Profile</Text>
                  </View>

                  <View style={styles.drawerProfileCard}>
                    <View style={styles.drawerAvatarRow}>
                      {getAvatarUri() ? (
                        <Image
                          source={{ uri: getAvatarUri() }}
                          style={styles.drawerAvatarImage}
                        />
                      ) : (
                        <View style={styles.drawerAvatar}>
                          <Text style={styles.drawerAvatarText}>
                            {loading ? "..." : getUserInitials()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.drawerIdentity}>
                        <Text style={styles.drawerUserName}>
                          {loading ? "Loading..." : user?.name || "Collector"}
                        </Text>
                        <Text style={styles.drawerUserEmail}>
                          {loading
                            ? "Please wait"
                            : user?.email || "user@email.com"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.drawerMetaRow}>
                      <View style={styles.drawerMetaPill}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={14}
                          color={authColors.sparkle}
                        />
                        <Text style={styles.drawerMetaText}>
                          {getUserRoleLabel()}
                        </Text>
                      </View>
                      <View style={styles.drawerMetaPill}>
                        <Ionicons
                          name="person-outline"
                          size={14}
                          color={authColors.accentSoft}
                        />
                        <Text style={styles.drawerMetaText}>
                          {user?.contact ? "Profile Ready" : "Set Up Profile"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={hideDrawer}
                    style={styles.drawerCloseButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={authColors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.drawerBody}
                  contentContainerStyle={styles.drawerBodyContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.drawerItems}>
                    {drawerItems.map((item) => {
                      const isActive = activeTab === item.screen;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.drawerItem,
                            isActive && styles.drawerItemActive,
                          ]}
                          onPress={
                            item.isLogout
                              ? openLogoutModal
                              : item.isAdminSwitch
                              ? handleSwitchToAdmin
                              : () => handleNavigation(item.screen)
                          }
                          activeOpacity={0.82}
                        >
                          <View style={styles.drawerItemIconWrap}>
                            <Ionicons
                              name={item.icon}
                              size={20}
                              color={
                                item.isLogout
                                  ? authColors.danger
                                  : item.isAdminSwitch
                                  ? authColors.sparkle
                                  : authColors.accentSoft
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.drawerItemText,
                              item.isLogout && styles.drawerItemLogoutText,
                              item.isAdminSwitch && styles.drawerItemAdminText,
                            ]}
                          >
                            {item.label}
                          </Text>
                          {!item.isLogout && !item.isAdminSwitch && (
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={authColors.textMuted}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.drawerFooter}>
                    <View style={styles.drawerFooterCard}>
                      <Text style={styles.drawerFooterText}>Card Store</Text>
                      <Text style={styles.drawerFooterSubtext}>
                        Curated picks for every collector
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        transparent
        visible={logoutVisible}
        onRequestClose={closeLogoutModal}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={closeLogoutModal}>
          <View style={styles.logoutOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.logoutCard}>
                <View style={styles.logoutIconWrap}>
                  <Ionicons
                    name="log-out-outline"
                    size={26}
                    color={authColors.danger}
                  />
                </View>
                <Text style={styles.logoutTitle}>Leave Infinite Pulls?</Text>
                <Text style={styles.logoutDescription}>
                  Your current session will end and you will return to the login
                  screen.
                </Text>
                <View style={styles.logoutActions}>
                  <TouchableOpacity
                    style={styles.logoutSecondaryButton}
                    onPress={closeLogoutModal}
                    activeOpacity={0.82}
                    disabled={loggingOut}
                  >
                    <Text style={styles.logoutSecondaryText}>Stay Here</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.logoutPrimaryButton,
                      loggingOut && styles.logoutPrimaryButtonDisabled,
                    ]}
                    onPress={handleLogout}
                    activeOpacity={0.82}
                    disabled={loggingOut}
                  >
                    {loggingOut ? (
                      <ActivityIndicator
                        size="small"
                        color={authColors.textPrimary}
                      />
                    ) : (
                      <Text style={styles.logoutPrimaryText}>Logout</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  content: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: authColors.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 154, 134, 0.16)",
    zIndex: 20,
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  childContent: {
    flex: 1,
  },
  profileTrigger: {
    zIndex: 40,
  },
  profileTriggerInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(199, 104, 91, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.24)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  profileTriggerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.24)",
    backgroundColor: authColors.surfaceStrong,
  },
  profileTriggerText: {
    color: authColors.textPrimary,
    fontFamily: authFonts.bold,
    fontSize: 14,
  },
  topBarSideSpacer: {
    width: 44,
    height: 44,
  },
  topBarRight: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  brandName: {
    color: authColors.accentSoft,
    fontSize: 20,
    fontFamily: authFonts.brand,
    letterSpacing: 0.1,
    textAlign: "center",
    textShadowColor: "rgba(18, 11, 10, 0.65)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 2,
  },
  tabBarLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  tabBarWrap: {
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    backgroundColor: "transparent",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(58, 43, 40, 0.9)",
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconBubbleActive: {
    backgroundColor: authColors.accent,
  },
  tabLabel: {
    color: authColors.textMuted,
    fontSize: 11,
    fontFamily: authFonts.semibold,
  },
  tabLabelActive: {
    color: authColors.textPrimary,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 11, 10, 0.76)",
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: authColors.panel,
    paddingTop: 44,
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  drawerFloatingCard: {
    position: "absolute",
    width: 170,
    height: 108,
    borderRadius: 18,
    backgroundColor: "rgba(199, 104, 91, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.14)",
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  drawerCardOne: {
    top: 76,
    right: -44,
    transform: [{ rotate: "16deg" }],
  },
  drawerCardTwo: {
    top: 250,
    left: -52,
    transform: [{ rotate: "-10deg" }],
  },
  drawerCardThree: {
    bottom: 120,
    right: 28,
    width: 130,
    height: 86,
    transform: [{ rotate: "8deg" }],
  },
  drawerHeader: {
    paddingBottom: 22,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 154, 134, 0.12)",
  },
  drawerHeaderBadge: {
    marginBottom: 14,
    paddingRight: 52,
  },
  drawerHeaderEyebrow: {
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  drawerHeaderTitle: {
    color: authColors.accentSoft,
    fontSize: 24,
    fontFamily: authFonts.brand,
    letterSpacing: 0.3,
  },
  drawerProfileCard: {
    backgroundColor: "rgba(94, 65, 60, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.16)",
    borderRadius: 24,
    padding: 14,
    width: "100%",
    alignSelf: "stretch",
  },
  drawerAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: authColors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  drawerAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 14,
    backgroundColor: authColors.surfaceStrong,
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.18)",
  },
  drawerAvatarText: {
    color: authColors.textPrimary,
    fontSize: 24,
    fontFamily: authFonts.bold,
  },
  drawerIdentity: {
    flex: 1,
  },
  drawerUserName: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  drawerUserEmail: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  drawerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  drawerMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(40, 28, 25, 0.64)",
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  drawerMetaText: {
    color: authColors.textPrimary,
    fontSize: 11,
    fontFamily: authFonts.semibold,
  },
  drawerCloseButton: {
    position: "absolute",
    top: 6,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(199, 104, 91, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 22,
  },
  drawerItems: {
    gap: 10,
    paddingBottom: 16,
  },
  drawerFooter: {
    marginTop: "auto",
    paddingTop: 8,
  },
  drawerFooterCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(94, 65, 60, 0.26)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.12)",
  },
  drawerFooterText: {
    color: authColors.accentSoft,
    fontSize: 14,
    fontFamily: authFonts.brand,
  },
  drawerFooterSubtext: {
    marginTop: 4,
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: "rgba(94, 65, 60, 0.30)",
  },
  drawerItemActive: {
    backgroundColor: "rgba(199, 104, 91, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.26)",
  },
  drawerItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(199, 104, 91, 0.12)",
    marginRight: 12,
  },
  drawerItemText: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 15,
    fontFamily: authFonts.semibold,
  },
  drawerItemLogoutText: {
    color: authColors.danger,
  },
  drawerItemAdminText: {
    color: authColors.sparkle,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 11, 10, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  logoutCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: authColors.panel,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logoutIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(224, 122, 106, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(224, 122, 106, 0.24)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoutTitle: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  logoutDescription: {
    color: authColors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: authFonts.regular,
    textAlign: "center",
    marginBottom: 20,
  },
  logoutActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  logoutSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    backgroundColor: authColors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  logoutSecondaryText: {
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
  logoutPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: authColors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  logoutPrimaryButtonDisabled: {
    opacity: 0.72,
  },
  logoutPrimaryText: {
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
});

export default UserDrawer;
