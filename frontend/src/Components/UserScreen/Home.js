import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  Modal,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getUser, getToken, logout } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import { listProducts } from '../../redux/actions/productActions';
import { authColors, authFonts } from '../../theme/authTheme';
import StoreProductCard from './components/StoreProductCard';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const CATEGORIES = ['All', 'Sports', 'Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'One Piece', 'Dragon Ball', 'Weiss Schwarz', 'Other TCG'];
const BANNERS = [require('../sliding/1.jpg'), require('../sliding/2.jpg'), require('../sliding/3.jpg'), require('../sliding/4.jpg')];
const SHOWCASE = [
  { key: 'Pokemon', icon: 'catching-pokemon' },
  { key: 'Sports', icon: 'sports-basketball' },
  { key: 'Magic: The Gathering', icon: 'auto-awesome' },
  { key: 'Yu-Gi-Oh!', icon: 'bolt' },
  { key: 'One Piece', icon: 'sailing' },
  { key: 'Dragon Ball', icon: 'flare' },
];

const Toast = ({ message, opacity }) => (
  <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
    <Text style={styles.toastText}>{message}</Text>
  </Animated.View>
);

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading: loadingProducts, products = [] } = useSelector((state) => state.productList);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [sortAscending, setSortAscending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [productReviews, setProductReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});
  const [bottomNavScrollY, setBottomNavScrollY] = useState(0);
  const bannerRef = useRef(null);
  const autoSlideTimer = useRef(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitialData();
    return () => stopAutoSlide();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      fetchAllProductReviews(products);
    }
  }, [products]);

  useEffect(() => {
    startAutoSlide();
    return () => stopAutoSlide();
  }, [currentBannerIndex]);

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    autoSlideTimer.current = setInterval(() => {
      const next = (currentBannerIndex + 1) % BANNERS.length;
      bannerRef.current?.scrollToOffset({ offset: next * BANNER_WIDTH, animated: true });
      setCurrentBannerIndex(next);
    }, 3200);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  };

  const loadInitialData = async () => {
    try {
      const currentUser = await getUser();
      setUser(currentUser);
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      dispatch(listProducts());
      await fetchCart();
    } catch (error) {
      console.error('Error loading home:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${BACKEND_URL}/api/v1/cart`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data?.success) {
        setCartCount(response.data.cart?.items?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching cart:', error?.response?.data || error.message);
      if (error.response?.status === 401) {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
  };

  const fetchAllProductReviews = async (items) => {
    const nextLoading = {};
    items.forEach((item) => { nextLoading[item._id] = true; });
    setLoadingReviews(nextLoading);

    const results = await Promise.all(items.map(async (item) => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${item._id}`);
        return [item._id, response.data?.reviews || []];
      } catch {
        return [item._id, []];
      }
    }));

    const reviewMap = {};
    const loadingMap = {};
    results.forEach(([productId, reviews]) => {
      reviewMap[productId] = reviews;
      loadingMap[productId] = false;
    });
    setProductReviews(reviewMap);
    setLoadingReviews(loadingMap);
  };

  const getAverageRating = (productId) => {
    const reviews = productReviews[productId] || [];
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length;
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const min = appliedMinPrice !== '' ? Number(appliedMinPrice) : null;
    const max = appliedMaxPrice !== '' ? Number(appliedMaxPrice) : null;
    return [...products].filter((product) => {
      const price = Number(product.discountedPrice || product.price || 0);
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesQuery = !query || product.name?.toLowerCase().includes(query) || product.category?.toLowerCase().includes(query) || product.description?.toLowerCase().includes(query);
      const matchesMin = min === null || Number.isNaN(min) || price >= min;
      const matchesMax = max === null || Number.isNaN(max) || price <= max;
      return matchesCategory && matchesQuery && matchesMin && matchesMax;
    }).sort((a, b) => {
      const priceA = Number(a.discountedPrice || a.price || 0);
      const priceB = Number(b.discountedPrice || b.price || 0);
      return sortAscending ? priceA - priceB : priceB - priceA;
    });
  }, [products, searchQuery, selectedCategory, appliedMinPrice, appliedMaxPrice, sortAscending]);

  const featuredProducts = useMemo(() => [...products].sort((a, b) => getAverageRating(b._id) - getAverageRating(a._id)).slice(0, 4), [products, productReviews]);
  const discountedProducts = useMemo(() => products.filter((product) => product.isOnSale).slice(0, 4), [products]);

  const handleAddToCart = async (product) => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const response = await axios.post(`${BACKEND_URL}/api/v1/cart/add`, { productId: product._id }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      if (response.data?.success) {
        setCartCount(response.data.cart?.items?.length || 0);
        showToast(`${product.name} added to cart`);
      }
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to add item');
    }
  };

  const handleBuyNow = (product) => navigation.navigate('Checkout', { productId: product._id, quantity: 1, product: { ...product, effectivePrice: product.discountedPrice || product.price } });
  const handleProductPress = (product) => navigation.navigate('SingleProduct', { productId: product._id });
  const applyFilters = () => { setAppliedMinPrice(minPrice.trim()); setAppliedMaxPrice(maxPrice.trim()); setShowFilters(false); };
  const clearFilters = () => { setSelectedCategory('All'); setMinPrice(''); setMaxPrice(''); setAppliedMinPrice(''); setAppliedMaxPrice(''); setShowFilters(false); };
  const onRefresh = async () => { setRefreshing(true); await loadInitialData(); setRefreshing(false); };

  const renderProductCard = (product, compact = false, keyPrefix = 'item') => (
    <StoreProductCard
      key={`${keyPrefix}-${product._id}`}
      product={product}
      compact={compact}
      onPress={() => handleProductPress(product)}
      onAddToCart={() => handleAddToCart(product)}
      onBuyNow={() => handleBuyNow(product)}
      ratingValue={getAverageRating(product._id)}
      ratingCount={(productReviews[product._id] || []).length}
      loadingRating={loadingReviews[product._id]}
    />
  );

  if (loading || loadingProducts) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={authColors.accent} /></View>;
  }

  const topBarRight = (
    <View style={styles.topBarActions}>
      <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.navigate('OrderNotification')} activeOpacity={0.82}>
        <Icon name="notifications-none" size={20} color={authColors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.navigate('Cart')} activeOpacity={0.82}>
        <Icon name="shopping-bag" size={20} color={authColors.textPrimary} />
        {cartCount > 0 ? <View style={styles.topBarBadge}><Text style={styles.topBarBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text></View> : null}
      </TouchableOpacity>
    </View>
  );

  return (
    <UserDrawer topBarRight={topBarRight} bottomNavScrollY={bottomNavScrollY}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScroll={(event) => setBottomNavScrollY(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.hero}>
            <View style={[styles.floatCard, styles.floatOne]} />
            <View style={[styles.floatCard, styles.floatTwo]} />
            <Text style={styles.eyebrow}>Curated for you</Text>
            <Text style={styles.title}>{user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Welcome back'}</Text>
            <Text style={styles.subtitle}>Featured packs, active deals, and storefront categories in one place.</Text>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Icon name="search" size={18} color={authColors.textMuted} />
                <TextInput style={styles.searchInput} placeholder="Search cards, sets, and packs" placeholderTextColor={authColors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Icon name="close" size={18} color={authColors.textMuted} /></TouchableOpacity> : null}
              </View>
              <TouchableOpacity style={[styles.filterButton, (selectedCategory !== 'All' || appliedMinPrice || appliedMaxPrice) && styles.filterButtonActive]} onPress={() => setShowFilters(true)} activeOpacity={0.82}>
                <Icon name="tune" size={20} color={(selectedCategory !== 'All' || appliedMinPrice || appliedMaxPrice) ? authColors.textPrimary : authColors.accentSoft} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList ref={bannerRef} data={BANNERS} renderItem={({ item }) => <Image source={item} style={styles.banner} resizeMode="cover" />} keyExtractor={(_, index) => `banner-${index}`} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(event) => setCurrentBannerIndex(Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH))} onScrollBeginDrag={stopAutoSlide} onScrollEndDrag={startAutoSlide} />
          <View style={styles.bannerDots}>{BANNERS.map((_, index) => <View key={`dot-${index}`} style={[styles.bannerDot, currentBannerIndex === index && styles.bannerDotActive]} />)}</View>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Shop by Category</Text><TouchableOpacity onPress={() => setSelectedCategory('All')}><Text style={styles.linkText}>View all</Text></TouchableOpacity></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SHOWCASE.map((item) => {
              const active = selectedCategory === item.key;
              return (
                <TouchableOpacity key={item.key} style={[styles.showcaseCard, active && styles.showcaseCardActive]} onPress={() => setSelectedCategory(item.key)} activeOpacity={0.84}>
                  <View style={[styles.showcaseIcon, active && styles.showcaseIconActive]}><Icon name={item.icon} size={20} color={active ? authColors.textPrimary : authColors.accentSoft} /></View>
                  <Text style={styles.showcaseLabel}>{item.key}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Featured Products</Text><Text style={styles.metaText}>{featuredProducts.length} picks</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{featuredProducts.map((item) => renderProductCard(item, true, 'featured'))}</ScrollView>

          {discountedProducts.length > 0 ? <><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Discounted Packs</Text><Text style={styles.metaText}>{discountedProducts.length} on sale</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{discountedProducts.map((item) => renderProductCard(item, true, 'discounted'))}</ScrollView></> : null}

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{selectedCategory === 'All' ? 'All Products' : `${selectedCategory} Cards`}</Text><Text style={styles.metaText}>{filteredProducts.length} shown</Text></View>
          {filteredProducts.length ? <View style={styles.grid}>{filteredProducts.map((item) => <View key={item._id} style={styles.gridItem}>{renderProductCard(item, false, 'grid')}</View>)}</View> : <View style={styles.emptyBox}><Icon name="search-off" size={44} color={authColors.textMuted} /><Text style={styles.emptyTitle}>No card listings found</Text><Text style={styles.emptySubtitle}>Try another search, category, or price range.</Text></View>}
          <View style={{ height: 24 }} />
        </ScrollView>

        <Toast message={toastMessage} opacity={toastOpacity} />

        <Modal transparent visible={showFilters} animationType="fade" onRequestClose={() => setShowFilters(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Filter Products</Text><TouchableOpacity onPress={() => setShowFilters(false)}><Icon name="close" size={20} color={authColors.textMuted} /></TouchableOpacity></View>
              <Text style={styles.modalLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>{CATEGORIES.map((category) => <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}><Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>{category}</Text></TouchableOpacity>)}</ScrollView>
              <Text style={styles.modalLabel}>Price Range</Text>
              <View style={styles.priceRow}><TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={authColors.textMuted} keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} /><Text style={styles.priceDash}>-</Text><TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={authColors.textMuted} keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} /></View>
              <View style={styles.modalActions}><TouchableOpacity style={styles.secondaryButton} onPress={clearFilters}><Text style={styles.secondaryText}>Clear</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={applyFilters}><Text style={styles.primaryText}>Apply</Text></TouchableOpacity></View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: authColors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: authColors.background },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(199, 104, 91, 0.16)', borderWidth: 1, borderColor: 'rgba(240, 154, 134, 0.16)' },
  topBarBadge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: authColors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  topBarBadgeText: { color: authColors.darkText, fontSize: 10, fontFamily: authFonts.bold },
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 28, padding: 20, backgroundColor: 'rgba(94, 65, 60, 0.24)', borderWidth: 1, borderColor: authColors.surfaceBorder, overflow: 'hidden' },
  floatCard: { position: 'absolute', width: 150, height: 90, borderRadius: 18, backgroundColor: 'rgba(199, 104, 91, 0.10)', borderWidth: 1, borderColor: 'rgba(240, 154, 134, 0.12)' },
  floatOne: { top: 12, right: -28, transform: [{ rotate: '10deg' }] },
  floatTwo: { bottom: -20, left: -26, transform: [{ rotate: '-8deg' }] },
  eyebrow: { color: authColors.sparkle, fontSize: 12, fontFamily: authFonts.semibold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  title: { color: authColors.accentSoft, fontSize: 32, fontFamily: authFonts.brand, marginBottom: 8 },
  subtitle: { color: authColors.textMuted, fontSize: 14, lineHeight: 22, fontFamily: authFonts.regular },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: authColors.surface, borderRadius: 22, borderWidth: 1, borderColor: authColors.surfaceBorder, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: authColors.textPrimary, fontSize: 15, fontFamily: authFonts.regular, paddingVertical: 12, marginLeft: 8 },
  filterButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.surfaceBorder },
  filterButtonActive: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  banner: { width: BANNER_WIDTH, height: 184, borderRadius: 24, marginTop: 18, marginHorizontal: 16 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(240, 154, 134, 0.20)' },
  bannerDotActive: { width: 20, backgroundColor: authColors.accentSoft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { color: authColors.textPrimary, fontSize: 18, fontFamily: authFonts.bold },
  metaText: { color: authColors.textMuted, fontSize: 13, fontFamily: authFonts.regular },
  linkText: { color: authColors.accentSoft, fontSize: 13, fontFamily: authFonts.semibold },
  chipRow: { paddingHorizontal: 16, paddingRight: 28, gap: 12 },
  showcaseCard: { width: 112, borderRadius: 20, padding: 14, backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.surfaceBorder },
  showcaseCardActive: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  showcaseIcon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(199, 104, 91, 0.12)', marginBottom: 12 },
  showcaseIconActive: { backgroundColor: 'rgba(42, 32, 29, 0.16)' },
  showcaseLabel: { color: authColors.textPrimary, fontSize: 13, fontFamily: authFonts.semibold },
  row: { paddingHorizontal: 16, paddingRight: 28, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  gridItem: { width: '48.5%', marginBottom: 14 },
  emptyBox: { marginHorizontal: 16, borderRadius: 24, paddingVertical: 42, paddingHorizontal: 20, alignItems: 'center', backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.surfaceBorder },
  emptyTitle: { color: authColors.textPrimary, fontSize: 18, fontFamily: authFonts.bold, marginTop: 14, marginBottom: 6 },
  emptySubtitle: { color: authColors.textMuted, fontSize: 14, fontFamily: authFonts.regular, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(18, 11, 10, 0.70)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { borderRadius: 22, backgroundColor: authColors.panel, borderWidth: 1, borderColor: authColors.surfaceBorder, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(240, 154, 134, 0.12)' },
  modalTitle: { color: authColors.textPrimary, fontSize: 18, fontFamily: authFonts.bold },
  modalLabel: { color: authColors.textMuted, fontSize: 12, fontFamily: authFonts.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 10, paddingHorizontal: 18 },
  modalChips: { paddingHorizontal: 18, paddingRight: 30, gap: 10 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: authColors.surface, borderWidth: 1, borderColor: authColors.surfaceBorder },
  categoryChipActive: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  categoryChipText: { color: authColors.textMuted, fontSize: 13, fontFamily: authFonts.semibold },
  categoryChipTextActive: { color: authColors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  priceInput: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: authColors.surfaceBorder, backgroundColor: authColors.surfaceStrong, color: authColors.textPrimary, fontSize: 14, fontFamily: authFonts.regular, paddingHorizontal: 12, paddingVertical: 11 },
  priceDash: { color: authColors.textMuted, fontSize: 18, marginHorizontal: 12 },
  modalActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: 18 },
  secondaryButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(199, 104, 91, 0.12)' },
  secondaryText: { color: authColors.textMuted, fontSize: 14, fontFamily: authFonts.semibold },
  primaryButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: authColors.accent },
  primaryText: { color: authColors.textPrimary, fontSize: 14, fontFamily: authFonts.semibold },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 22, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(42, 32, 29, 0.96)', borderWidth: 1, borderColor: 'rgba(240, 154, 134, 0.18)' },
  toastText: { color: authColors.textPrimary, fontSize: 13, fontFamily: authFonts.semibold, textAlign: 'center' },
});
