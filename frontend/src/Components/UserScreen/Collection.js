import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import UserDrawer from './UserDrawer';
import { listProducts } from '../../redux/actions/productActions';
import { authColors, authFonts } from '../../theme/authTheme';

const Collection = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, products = [] } = useSelector((state) => state.productList);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!products.length) {
      dispatch(listProducts());
    }
  }, [dispatch, products.length]);

  const categories = useMemo(() => {
    const unique = [...new Set(products.map((product) => product.category).filter(Boolean))];
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') {
      return products;
    }
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const highlightedCollections = useMemo(() => {
    return categories
      .filter((category) => category !== 'All')
      .slice(0, 3)
      .map((category, index) => {
        const categoryProducts = products.filter((product) => product.category === category);
        return {
          id: `${category}-${index}`,
          title: category,
          count: categoryProducts.length,
          cover: categoryProducts[0]?.images?.[0]?.url || null,
          accent: index % 2 === 0 ? authColors.accent : authColors.accentSoft,
        };
      });
  }, [categories, products]);

  const topBarRight = (
    <TouchableOpacity
      style={styles.headerActionButton}
      onPress={() => navigation.navigate('Cart')}
      activeOpacity={0.82}
    >
      <Icon name="shopping-bag" size={20} color={authColors.textPrimary} />
    </TouchableOpacity>
  );

  return (
    <UserDrawer topBarRight={topBarRight}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={[styles.heroFloatingCard, styles.heroCardOne]} />
          <View style={[styles.heroFloatingCard, styles.heroCardTwo]} />
          <Text style={styles.heroEyebrow}>Collector Shelf</Text>
          <Text style={styles.heroTitle}>Collection</Text>
          <Text style={styles.heroSubtitle}>
            Browse trading card sets, collector favorites, and standout marketplace drops in one curated space.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Cards</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{Math.max(categories.length - 1, 0)}</Text>
              <Text style={styles.statLabel}>Collections</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{filteredProducts.length}</Text>
              <Text style={styles.statLabel}>Showing</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Collection</Text>
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

        {highlightedCollections.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Shelves</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {highlightedCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.featureCard}
                  onPress={() => setSelectedCategory(collection.title)}
                  activeOpacity={0.85}
                >
                  {collection.cover ? (
                    <Image source={{ uri: collection.cover }} style={styles.featureImage} />
                  ) : (
                    <View style={styles.featureImageFallback}>
                      <Icon name="style" size={34} color={authColors.textMuted} />
                    </View>
                  )}
                  <View style={styles.featureOverlay} />
                  <View style={[styles.featureAccent, { backgroundColor: collection.accent }]} />
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{collection.title}</Text>
                    <Text style={styles.featureCount}>{collection.count} cards</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cards in View</Text>
            <Text style={styles.sectionMeta}>{filteredProducts.length} items</Text>
          </View>

          {loading && !products.length ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={authColors.accent} />
              <Text style={styles.loadingText}>Loading collection...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="inventory-2" size={52} color={authColors.textMuted} />
              <Text style={styles.emptyTitle}>No cards in this collection yet</Text>
              <Text style={styles.emptySubtitle}>Try another collection to see more card options.</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <TouchableOpacity
                  key={product._id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('SingleProduct', { productId: product._id })}
                  activeOpacity={0.85}
                >
                  {product.images?.[0]?.url ? (
                    <Image source={{ uri: product.images[0].url }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImageFallback}>
                      <Icon name="photo-library" size={28} color={authColors.textMuted} />
                    </View>
                  )}
                  <View style={styles.productBody}>
                    <Text style={styles.productCategory}>
                      {product.category || 'Collection'}{product.condition ? ` · ${product.condition}` : ''}
                    </Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      PHP {Number(product.discountedPrice || product.price || 0).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
    height: 94,
    borderRadius: 18,
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 154, 134, 0.14)',
  },
  heroCardOne: {
    top: 18,
    right: -28,
    transform: [{ rotate: '12deg' }],
  },
  heroCardTwo: {
    bottom: -14,
    left: -36,
    transform: [{ rotate: '-10deg' }],
  },
  heroEyebrow: {
    color: authColors.sparkle,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    maxWidth: '90%',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  statChip: {
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
  featuredRow: {
    paddingRight: 16,
    gap: 12,
  },
  featureCard: {
    width: 220,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.panelSoft,
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 11, 10, 0.26)',
  },
  featureAccent: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  featureContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  featureTitle: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  featureCount: {
    color: authColors.sparkle,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    paddingVertical: 42,
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
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: authFonts.regular,
    paddingHorizontal: 24,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 26,
  },
  productCard: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 138,
  },
  productImageFallback: {
    width: '100%',
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.panelSoft,
  },
  productBody: {
    padding: 12,
  },
  productCategory: {
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  productName: {
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: authFonts.semibold,
    minHeight: 40,
    marginBottom: 8,
  },
  productPrice: {
    color: authColors.accentSoft,
    fontSize: 14,
    fontFamily: authFonts.bold,
  },
});

export default Collection;
