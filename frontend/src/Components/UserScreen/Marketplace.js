import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import UserDrawer from './UserDrawer';
import { listProducts } from '../../redux/actions/productActions';
import { authColors, authFonts } from '../../theme/authTheme';
import StoreProductCard from './components/StoreProductCard';
import { getToken } from '../../utils/helper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const MARKETPLACE_CATEGORIES = [
  'Sports',
  'Pokemon',
  'Magic: The Gathering',
  'Yu-Gi-Oh!',
  'One Piece',
  'Dragon Ball',
  'Weiss Schwarz',
  'Other TCG',
];

const Toast = ({ message, type, opacity }) => (
  <Animated.View
    pointerEvents="none"
    style={[
      styles.toast,
      type === 'error' ? styles.toastError : styles.toastSuccess,
      { opacity },
    ]}
  >
    <View style={[styles.toastIconWrap, type === 'error' ? styles.toastIconError : styles.toastIconSuccess]}>
      <Icon
        name={type === 'error' ? 'priority-high' : 'check'}
        size={16}
        color={type === 'error' ? authColors.danger : authColors.success}
      />
    </View>
    <View style={styles.toastTextWrap}>
      <Text style={styles.toastTitle}>{type === 'error' ? 'Add to Cart Failed' : 'Added to Cart'}</Text>
      <Text style={styles.toastMessage} numberOfLines={2}>{message}</Text>
    </View>
  </Animated.View>
);

const Marketplace = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, products = [] } = useSelector((state) => state.productList);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartCount, setCartCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [bottomNavScrollY, setBottomNavScrollY] = useState(0);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(listProducts());
    fetchCartCount();
  }, [dispatch]);

  const fetchCartCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/api/v1/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        setCartCount(response.data.cart?.items?.length || 0);
      }
    } catch (error) {
      console.error('Marketplace cart fetch error:', error?.response?.data || error.message);
    }
  };

  const categories = useMemo(() => {
    const dynamicCategories = products
      .map((product) => product.category)
      .filter(Boolean);
    const merged = [...new Set([...MARKETPLACE_CATEGORIES, ...dynamicCategories])];
    return ['All', ...merged];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query
        || product.name?.toLowerCase().includes(query)
        || product.description?.toLowerCase().includes(query)
        || product.category?.toLowerCase().includes(query);
      const effectivePrice = Number(product.discountedPrice || product.price || 0);
      const min = appliedMinPrice !== '' ? Number(appliedMinPrice) : null;
      const max = appliedMaxPrice !== '' ? Number(appliedMaxPrice) : null;
      const matchesMin = min === null || Number.isNaN(min) || effectivePrice >= min;
      const matchesMax = max === null || Number.isNaN(max) || effectivePrice <= max;

      return matchesCategory && matchesQuery && matchesMin && matchesMax;
    });
  }, [products, searchQuery, selectedCategory, appliedMinPrice, appliedMaxPrice]);

  const featuredPacks = useMemo(() => {
    return [...filteredProducts]
      .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
      .slice(0, 3);
  }, [filteredProducts]);

  const salePacks = useMemo(() => {
    return filteredProducts.filter((product) => product.isOnSale).slice(0, 3);
  }, [filteredProducts]);

  const topBarRight = (
    <TouchableOpacity
      style={styles.headerActionButton}
      onPress={() => navigation.navigate('Cart')}
      activeOpacity={0.82}
    >
      <Icon name="shopping-bag" size={20} color={authColors.textPrimary} />
      {cartCount > 0 ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const hasActiveFilters = selectedCategory !== 'All' || appliedMinPrice !== '' || appliedMaxPrice !== '';

  const applyFilters = () => {
    setAppliedMinPrice(minPrice.trim());
    setAppliedMaxPrice(maxPrice.trim());
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setShowFilters(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const handleAddToCart = async (product) => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cart/add`,
        { productId: product._id },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setCartCount(response.data.cart?.items?.length || 0);
        showToast(`${product.name} is ready in your cart.`);
      }
    } catch (error) {
      console.error('Marketplace add to cart error:', error?.response?.data || error.message);
      showToast(error?.response?.data?.message || 'Failed to add item to cart.', 'error');
    }
  };

  const handleBuyNow = (product) => {
    navigation.navigate('Checkout', {
      productId: product._id,
      quantity: 1,
      product: {
        ...product,
        effectivePrice: product.discountedPrice || product.price,
      },
    });
  };

  const renderPackCard = (product, compact = false) => {
    return (
      <StoreProductCard
        key={product._id}
        product={product}
        compact={compact}
        onPress={() => navigation.navigate('SingleProduct', { productId: product._id })}
        onAddToCart={() => handleAddToCart(product)}
        onBuyNow={() => handleBuyNow(product)}
        ratingValue={product.ratings || 0}
        ratingCount={product.numOfReviews || 0}
      />
    );
  };

  return (
    <UserDrawer topBarRight={topBarRight} bottomNavScrollY={bottomNavScrollY}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setBottomNavScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroFloatingCard, styles.heroCardOne]} />
          <View style={[styles.heroFloatingCard, styles.heroCardTwo]} />
          <Text style={styles.heroEyebrow}>Admin Curated</Text>
          <Text style={styles.heroTitle}>Marketplace</Text>
          <Text style={styles.heroSubtitle}>
            Inspired by modern card stores, this space focuses on store-owned packs, verified customer reviews,
            cart-ready checkout, and order tracking after every purchase.
          </Text>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Packs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{Math.max(categories.length - 1, 0)}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{products.filter((item) => item.isOnSale).length}</Text>
              <Text style={styles.statLabel}>Deals</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={authColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search packs, categories, or drops"
              placeholderTextColor={authColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.82}
          >
            <Icon
              name="tune"
              size={20}
              color={hasActiveFilters ? authColors.textPrimary : authColors.accentSoft}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((category) => {
              const active = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {featuredPacks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Packs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
              {featuredPacks.map((product) => renderPackCard(product, true))}
            </ScrollView>
          </View>
        ) : null}

        {salePacks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deals and Promotions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
              {salePacks.map((product) => renderPackCard(product, true))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Marketplace Packs</Text>
            <Text style={styles.sectionMeta}>{filteredProducts.length} shown</Text>
          </View>

          {(appliedMinPrice !== '' || appliedMaxPrice !== '' || selectedCategory !== 'All') ? (
            <View style={styles.activeFilterRow}>
              {selectedCategory !== 'All' ? (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>{selectedCategory}</Text>
                </View>
              ) : null}
              {appliedMinPrice !== '' || appliedMaxPrice !== '' ? (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    PHP {appliedMinPrice || '0'} - {appliedMaxPrice || 'Any'}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={clearFilters} activeOpacity={0.82}>
                <Text style={styles.clearFilterText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={authColors.accent} />
              <Text style={styles.loadingText}>Loading marketplace packs...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="inventory-2" size={48} color={authColors.textMuted} />
              <Text style={styles.emptyTitle}>No packs match this search</Text>
              <Text style={styles.emptySubtitle}>Try another category or search term.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredProducts.map((product) => renderPackCard(product))}
            </View>
          )}
        </View>
      </ScrollView>

      <Toast message={toast.message} type={toast.type} opacity={toastOpacity} />

      <Modal
        transparent
        visible={showFilters}
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilters(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Packs</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.8}>
                <Icon name="close" size={20} color={authColors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalCategoryRow}>
              {categories.map((category) => {
                const active = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(category)}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.filterLabel}>Price Range</Text>
            <View style={styles.priceInputRow}>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceInputLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={authColors.textMuted}
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
              </View>
              <Text style={styles.priceDash}>-</Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Any"
                  placeholderTextColor={authColors.textMuted}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.filterClearButton} onPress={clearFilters} activeOpacity={0.82}>
                <Text style={styles.filterClearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyButton} onPress={applyFilters} activeOpacity={0.82}>
                <Text style={styles.filterApplyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </UserDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(240, 154, 134, 0.16)',
  },
  headerBadge: {
    position: 'absolute',
    top: 3,
    right: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: authColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    color: authColors.darkText,
    fontSize: 10,
    fontFamily: authFonts.bold,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    backgroundColor: 'rgba(94, 65, 60, 0.24)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    overflow: 'hidden',
  },
  heroFloatingCard: {
    position: 'absolute',
    width: 150,
    height: 92,
    borderRadius: 18,
    backgroundColor: 'rgba(199, 104, 91, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240, 154, 134, 0.12)',
  },
  heroCardOne: {
    top: 14,
    right: -30,
    transform: [{ rotate: '10deg' }],
  },
  heroCardTwo: {
    bottom: -16,
    left: -30,
    transform: [{ rotate: '-8deg' }],
  },
  heroEyebrow: {
    color: authColors.sparkle,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  heroTitle: {
    color: authColors.accentSoft,
    fontSize: 34,
    fontFamily: authFonts.brand,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: authColors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: authFonts.regular,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 154, 134, 0.12)',
  },
  statValue: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  statLabel: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    paddingHorizontal: 14,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    color: authColors.textPrimary,
    fontFamily: authFonts.regular,
    fontSize: 15,
    paddingVertical: 12,
    marginLeft: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  filterButtonActive: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginBottom: 12,
  },
  sectionMeta: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  activeFilterChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  activeFilterChipText: {
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  clearFilterText: {
    color: authColors.accentSoft,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
  categoryRow: {
    paddingRight: 16,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  categoryChipActive: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  categoryChipText: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
  categoryChipTextActive: {
    color: authColors.textPrimary,
  },
  horizontalRow: {
    paddingRight: 16,
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 26,
  },
  packCard: {
    width: '48.5%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 12,
    minHeight: 294,
  },
  packCardCompact: {
    width: 220,
  },
  packImage: {
    width: '100%',
    height: 150,
  },
  packImageCompact: {
    height: 136,
  },
  packImageFallback: {
    width: '100%',
    height: 150,
    backgroundColor: authColors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 142,
  },
  packMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  packCategory: {
    flex: 1,
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  saleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: authColors.accent,
  },
  saleBadgeText: {
    color: authColors.textPrimary,
    fontSize: 10,
    fontFamily: authFonts.bold,
  },
  packName: {
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: authFonts.semibold,
    minHeight: 42,
    marginBottom: 10,
  },
  packInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  packRating: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  packStock: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  packPrice: {
    color: authColors.accentSoft,
    fontSize: 14,
    fontFamily: authFonts.bold,
  },
  packActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 154, 134, 0.1)',
  },
  packCartButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
  },
  packCartButtonText: {
    marginLeft: 4,
    fontSize: 10,
    color: authColors.accentSoft,
    fontFamily: authFonts.semibold,
    flexShrink: 1,
  },
  packBuyButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: authColors.accent,
  },
  packBuyButtonText: {
    marginLeft: 4,
    fontSize: 10,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
    flexShrink: 1,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 24,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  emptyTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 11, 10, 0.68)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  filterModalCard: {
    borderRadius: 22,
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 154, 134, 0.12)',
  },
  filterModalTitle: {
    color: authColors.textPrimary,
    fontSize: 18,
    fontFamily: authFonts.bold,
  },
  filterLabel: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 18,
  },
  modalCategoryRow: {
    paddingHorizontal: 18,
    paddingRight: 30,
    gap: 10,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
  },
  priceInputWrap: {
    flex: 1,
  },
  priceInputLabel: {
    color: authColors.textMuted,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    marginBottom: 6,
  },
  priceInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    backgroundColor: authColors.surfaceStrong,
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.regular,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  priceDash: {
    color: authColors.textMuted,
    fontSize: 18,
    marginHorizontal: 12,
    marginTop: 30,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  filterClearButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
  },
  filterClearButtonText: {
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
  filterApplyButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: authColors.accent,
  },
  filterApplyButtonText: {
    color: authColors.textPrimary,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
  toast: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: authColors.brandShadow,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: 'rgba(42, 32, 29, 0.96)',
    borderColor: 'rgba(143, 191, 122, 0.24)',
  },
  toastError: {
    backgroundColor: 'rgba(42, 32, 29, 0.96)',
    borderColor: 'rgba(224, 122, 106, 0.24)',
  },
  toastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconSuccess: {
    backgroundColor: 'rgba(143, 191, 122, 0.12)',
  },
  toastIconError: {
    backgroundColor: 'rgba(224, 122, 106, 0.12)',
  },
  toastTextWrap: {
    flex: 1,
  },
  toastTitle: {
    color: authColors.textPrimary,
    fontSize: 13,
    fontFamily: authFonts.bold,
    marginBottom: 3,
  },
  toastMessage: {
    color: authColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: authFonts.regular,
  },
});

export default Marketplace;

