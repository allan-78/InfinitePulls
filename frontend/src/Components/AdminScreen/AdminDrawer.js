import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  CommonActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getUser, logout, setAppViewMode } from "../../utils/helper";
import { adminColors, adminFonts, adminShadow } from "./adminTheme";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(width * 0.82, 320);

const routeMeta = {
  Dashboard: {
    menu: "Dashboard",
    title: "Store Control",
    subtitle: "Sales, traffic, and marketplace activity",
  },
  UserList: {
    menu: "Users",
    title: "Collector Accounts",
    subtitle: "Profiles, roles, and member activity",
  },
  CreateUser: {
    menu: "Users",
    title: "Create User",
    subtitle: "Add a new account to the platform",
  },
  UpdateUser: {
    menu: "Users",
    title: "Edit User",
    subtitle: "Adjust account details and access",
  },
  ViewUser: {
    menu: "Users",
    title: "User Details",
    subtitle: "Review member information",
  },
  TrashUser: {
    menu: "Users",
    title: "Archived Users",
    subtitle: "Restore or review removed accounts",
  },
  ProductList: {
    menu: "Listings",
    title: "Card Listings",
    subtitle: "Manage packs, inventory, and pricing",
  },
  CreateProduct: {
    menu: "Listings",
    title: "Create Listing",
    subtitle: "Add a new pack or card product",
  },
  UpdateProduct: {
    menu: "Listings",
    title: "Edit Listing",
    subtitle: "Update product details and promos",
  },
  ViewProduct: {
    menu: "Listings",
    title: "Listing Details",
    subtitle: "Inspect a listing before editing",
  },
  TrashProduct: {
    menu: "Listings",
    title: "Archived Listings",
    subtitle: "Review removed marketplace items",
  },
  OrderList: {
    menu: "Orders",
    title: "Order Queue",
    subtitle: "Track transactions and fulfillment",
  },
  ViewOrder: {
    menu: "Orders",
    title: "Order Details",
    subtitle: "Inspect order contents and delivery state",
  },
  UpdateOrder: {
    menu: "Orders",
    title: "Update Order",
    subtitle: "Change status and notify the buyer",
  },
  ReviewList: {
    menu: "Reviews",
    title: "Review Moderation",
    subtitle: "Ratings, feedback, and reported content",
  },
  ViewReview: {
    menu: "Reviews",
    title: "Review Details",
    subtitle: "Inspect buyer feedback",
  },
};

const menuItems = [
  { name: "Dashboard", icon: "view-dashboard-outline", screen: "Dashboard" },
  { name: "Users", icon: "account-group-outline", screen: "UserList" },
  { name: "Orders", icon: "clipboard-list-outline", screen: "OrderList" },
  { name: "Reviews", icon: "star-circle-outline", screen: "ReviewList" },
  { name: "Listings", icon: "cards-outline", screen: "ProductList" },
];

export default function AdminDrawer({ children }) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    getUser().then((user) => {
      if (mounted) {
        setAdminUser(user);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const currentMeta = routeMeta[route.name] || routeMeta.Dashboard;

  const activeMenu = useMemo(() => currentMeta.menu, [currentMeta.menu]);

  const toggleDrawer = () => {
    const nextOpen = !isDrawerOpen;
    setIsDrawerOpen(nextOpen);
    Animated.timing(drawerAnimation, {
      toValue: nextOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleNavigate = (screen) => {
    closeDrawer();
    if (route.name !== screen) {
      navigation.navigate(screen);
    }
  };

  const handleViewShop = async () => {
    await setAppViewMode("user");
    closeDrawer();
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "MainApp" }],
      }),
    );
  };

  const handleLogoutPress = () => {
    closeDrawer();
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
    } finally {
      setLogoutLoading(false);
      setLogoutModalVisible(false);
    }
  };

  const translateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const overlayOpacity = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.42],
  });

  const initials = (adminUser?.name || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.shell}>
      <View style={[styles.topBar, { marginTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity onPress={toggleDrawer} style={styles.topBarAvatar}>
          <Text style={styles.topBarAvatarText}>{initials}</Text>
        </TouchableOpacity>

        <View style={styles.topBarCopy}>
          <Text style={styles.topBarBrand}>Infinite Pulls</Text>
          <Text style={styles.topBarTitle}>{currentMeta.title}</Text>
        </View>

        <View style={styles.topBarBadge}>
          <Icon
            name="shield-crown-outline"
            size={20}
            color={adminColors.sparkle}
          />
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {isDrawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={isDrawerOpen ? "auto" : "none"}
        style={[styles.drawer, { transform: [{ translateX }] }]}
      >
        <View style={styles.drawerGlow} />
        <ScrollView contentContainerStyle={styles.drawerScroll}>
          <View
            style={[
              styles.drawerHero,
              { paddingTop: Math.max(insets.top, 10) },
            ]}
          >
            <View style={styles.drawerBadgeRow}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{initials}</Text>
              </View>
              <TouchableOpacity
                onPress={closeDrawer}
                style={styles.drawerClose}
              >
                <Icon name="close" size={20} color={adminColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.drawerBrand}>Infinite Pulls</Text>
            <Text style={styles.drawerRole}>Admin Console</Text>

            <View style={styles.drawerProfileCard}>
              <Text style={styles.drawerProfileName}>
                {adminUser?.name || "Store Admin"}
              </Text>
              <Text style={styles.drawerProfileEmail}>
                {adminUser?.email || "Admin account"}
              </Text>
              <View style={styles.drawerPills}>
                <View style={styles.drawerPill}>
                  <Icon
                    name="cards-playing-outline"
                    size={14}
                    color={adminColors.sparkle}
                  />
                  <Text style={styles.drawerPillText}>Marketplace</Text>
                </View>
                <View style={styles.drawerPill}>
                  <Icon
                    name="shield-check-outline"
                    size={14}
                    color={adminColors.success}
                  />
                  <Text style={styles.drawerPillText}>Full Access</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.menuSection}>
            {menuItems.map((item) => {
              const selected = item.name === activeMenu;
              return (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => handleNavigate(item.screen)}
                  style={[styles.menuCard, selected && styles.menuCardActive]}
                >
                  <View
                    style={[
                      styles.menuIconWrap,
                      selected && styles.menuIconWrapActive,
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={
                        selected ? adminColors.darkText : adminColors.accentSoft
                      }
                    />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text
                      style={[
                        styles.menuTitle,
                        selected && styles.menuTitleActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.menuSubtitle}>
                      {routeMeta[item.screen]?.subtitle || "Open section"}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={
                      selected ? adminColors.darkText : adminColors.textMuted
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Card Store</Text>
            <Text style={styles.footerSubtitle}>
              Curated control over packs, orders, and collectors.
            </Text>

            <TouchableOpacity
              onPress={handleViewShop}
              style={styles.shopButton}
            >
              <Icon
                name="storefront-outline"
                size={18}
                color={adminColors.darkText}
              />
              <Text style={styles.shopButtonText}>View Shop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogoutPress}
              style={styles.logoutButton}
            >
              <Icon name="logout" size={18} color={adminColors.textPrimary} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        transparent
        animationType="fade"
        visible={logoutModalVisible}
        onRequestClose={() => {
          if (!logoutLoading) {
            setLogoutModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon
                name="logout-variant"
                size={22}
                color={adminColors.accentSoft}
              />
            </View>

            <Text style={styles.modalTitle}>Leave admin console?</Text>
            <Text style={styles.modalText}>
              You will be signed out of Infinite Pulls and returned to the auth
              flow.
            </Text>

            <View style={styles.modalUserCard}>
              <View style={styles.modalUserAvatar}>
                <Text style={styles.modalUserAvatarText}>{initials}</Text>
              </View>
              <View style={styles.modalUserCopy}>
                <Text style={styles.modalUserName}>
                  {adminUser?.name || "Store Admin"}
                </Text>
                <Text style={styles.modalUserEmail}>
                  {adminUser?.email || "Admin account"}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setLogoutModalVisible(false)}
                disabled={logoutLoading}
              >
                <Text style={styles.modalSecondaryText}>Stay Here</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={confirmLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <ActivityIndicator color={adminColors.darkText} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 24,
    ...adminShadow,
  },
  topBarAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panelSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    ...adminShadow,
  },
  topBarAvatarText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 16,
  },
  topBarCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  topBarBrand: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.brand,
    fontSize: 19,
    textShadowColor: adminColors.brandShadow,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  topBarTitle: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 11,
    marginTop: 1,
  },
  topBarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panelSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 18,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: adminColors.backgroundSoft,
    borderRightWidth: 1,
    borderRightColor: adminColors.surfaceBorder,
    zIndex: 24,
  },
  drawerGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: adminColors.glowPrimary,
  },
  drawerScroll: {
    paddingTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  drawerHero: {
    marginBottom: 18,
  },
  drawerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  drawerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panelSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  drawerAvatarText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 22,
  },
  drawerClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.surface,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  drawerBrand: {
    color: adminColors.accentSoft,
    fontFamily: adminFonts.brand,
    fontSize: 28,
    marginBottom: 6,
  },
  drawerRole: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.semibold,
    fontSize: 13,
    marginBottom: 16,
  },
  drawerProfileCard: {
    backgroundColor: adminColors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    padding: 16,
    ...adminShadow,
  },
  drawerProfileName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  drawerProfileEmail: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  drawerPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  drawerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: adminColors.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  drawerPillText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 12,
  },
  menuSection: {
    gap: 10,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  menuCardActive: {
    backgroundColor: adminColors.accentSoft,
    borderColor: adminColors.accentSoft,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.chip,
  },
  menuIconWrapActive: {
    backgroundColor: "rgba(42, 32, 29, 0.18)",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 15,
  },
  menuTitleActive: {
    color: adminColors.darkText,
  },
  menuSubtitle: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 11,
    marginTop: 3,
  },
  footerCard: {
    marginTop: 18,
    backgroundColor: adminColors.panel,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 24,
    padding: 16,
  },
  footerTitle: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 16,
  },
  footerSubtitle: {
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  shopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 18,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  shopButtonText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.surfaceStrong,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
    borderRadius: 18,
    paddingVertical: 12,
    gap: 8,
  },
  logoutText: {
    color: adminColors.textPrimary,
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
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.chip,
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
  modalUserCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: adminColors.backgroundSoft,
    borderWidth: 1,
    borderColor: adminColors.surfaceBorder,
  },
  modalUserAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.panelSoft,
    marginRight: 12,
  },
  modalUserAvatarText: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.bold,
    fontSize: 18,
  },
  modalUserCopy: {
    flex: 1,
  },
  modalUserName: {
    color: adminColors.textPrimary,
    fontFamily: adminFonts.semibold,
    fontSize: 14,
  },
  modalUserEmail: {
    marginTop: 3,
    color: adminColors.textMuted,
    fontFamily: adminFonts.regular,
    fontSize: 12,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminColors.accentSoft,
    borderRadius: 16,
    paddingVertical: 13,
  },
  modalPrimaryText: {
    color: adminColors.darkText,
    fontFamily: adminFonts.bold,
    fontSize: 14,
  },
});
