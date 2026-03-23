// CVPetShop/frontend/src/Components/UserScreen/SingleProduct.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getToken } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import { listProductDetails } from '../../redux/actions/productActions';
import { listProductReviews, createProductReview } from '../../redux/actions/reviewActions';
import { authColors, authFonts } from '../../theme/authTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

// Function to dismiss keyboard
const dismissKeyboard = () => {
  Keyboard.dismiss();
};

// ─── Image Carousel ───────────────────────────────────────────────────────────
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images && images.length > 0 && images.some(img => img && (img.url || typeof img === 'string'));
  const urls = validImages
    ? images.filter(img => img && (img.url || typeof img === 'string')).map(img => img.url || img)
    : [];

  if (!validImages || urls.length === 0) {
    return (
      <View style={styles.noImageBox}>
        <Icon name="style" size={64} color="#ccc" />
        <Text style={styles.noImageText}>No card image available</Text>
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <Image source={{ uri: urls[currentIndex] }} style={styles.mainImage} resizeMode="cover" />

      {urls.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>{currentIndex + 1} / {urls.length}</Text>
        </View>
      )}

      {urls.length > 1 && (
        <>
          <TouchableOpacity
            style={styles.arrowLeft}
            onPress={() => setCurrentIndex(p => (p === 0 ? urls.length - 1 : p - 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arrowRight}
            onPress={() => setCurrentIndex(p => (p === urls.length - 1 ? 0 : p + 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </>
      )}

      {urls.length > 1 && (
        <View style={styles.dotsContainer} pointerEvents="none">
          {urls.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      {urls.length > 1 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.thumbnailStrip}
          contentContainerStyle={styles.thumbnailContent}
        >
          {urls.map((url, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)} activeOpacity={0.8}>
              <Image
                source={{ uri: url }}
                style={[styles.thumbnail, i === currentIndex && styles.thumbnailActive]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ─── Star Rating Component ───────────────────────────────────────────────────
const StarRating = ({ rating, size = 16, showRating = false, interactive = false, onRate = null }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  const renderStars = () => {
    if (interactive) {
      return (
        <View style={styles.interactiveStarsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => onRate && onRate(i)}>
              <Icon
                name={i <= rating ? 'star' : 'star-border'}
                size={size}
                color={i <= rating ? '#FFD700' : '#ccc'}
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      return (
        <View style={styles.starsRow}>
          {[...Array(fullStars)].map((_, i) => (
            <Icon key={`full-${i}`} name="star" size={size} color="#FFD700" />
          ))}
          {halfStar && <Icon name="star-half" size={size} color="#FFD700" />}
          {[...Array(emptyStars)].map((_, i) => (
            <Icon key={`empty-${i}`} name="star-border" size={size} color="#ccc" />
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.starRatingContainer}>
      {renderStars()}
      {showRating && !interactive && (
        <Text style={styles.ratingText}>({rating.toFixed(1)})</Text>
      )}
    </View>
  );
};

// ─── Stock Badge ──────────────────────────────────────────────────────────────
const StockBadge = ({ stock }) => {
  if (stock === undefined || stock === null) return null;
  const inStock = stock > 0;
  return (
    <View style={[styles.stockBadge, inStock ? styles.stockIn : styles.stockOut]}>
      <Icon name={inStock ? 'check-circle' : 'cancel'} size={14} color={inStock ? '#2e7d32' : '#c62828'} />
      <Text style={[styles.stockText, inStock ? styles.stockTextIn : styles.stockTextOut]}>
        {inStock ? `In Stock (${stock})` : 'Out of Stock'}
      </Text>
    </View>
  );
};

// ─── Discount Badge ────────────────────────────────────────────────────────────
const DiscountBadge = ({ percentage }) => {
  if (!percentage) return null;
  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountBadgeText}>{percentage}% OFF</Text>
    </View>
  );
};

// ─── Review Item Component ───────────────────────────────────────────────────
const ReviewItem = ({ review, isUserReview = false }) => {
  return (
    <View style={[styles.reviewItem, isUserReview && styles.userReviewItem]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerAvatarText}>
              {review.name ? review.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{review.name || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, opacity }) => (
  <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
    <Text style={styles.toastText}>{message}</Text>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SingleProduct({ route, navigation }) {
  const { productId } = route.params;
  const dispatch = useDispatch();

  const productDetails = useSelector((state) => state.productDetails);
  const { loading: loadingProduct, error, product } = productDetails;

  const reviewList = useSelector((state) => state.reviewList);
  const { loading: loadingReviews, error: errorReviews, reviews } = reviewList;

  const reviewCreate = useSelector((state) => state.reviewCreate);
  const { loading: submittingReview, success: successReview, error: errorReviewCreate } = reviewCreate;

  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Review states
  const [userReview, setUserReview] = useState(null);
  const [loadingUserReview, setLoadingUserReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [expandedReviews, setExpandedReviews] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(listProductDetails(productId));
    dispatch(listProductReviews(productId));
  }, [dispatch, productId]);

  useEffect(() => {
    if (product && product._id) {
      checkUserReview();
      checkReviewEligibility();
    }
  }, [product]);

  useEffect(() => {
    if (successReview) {
      Alert.alert('Success', userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
      setReviewModalVisible(false);
      dismissKeyboard();
      dispatch(listProductDetails(productId));
      dispatch(listProductReviews(productId));
      checkUserReview();
      dispatch({ type: 'REVIEW_CREATE_RESET' });
    }
  }, [successReview, dispatch, userReview, productId]);



  // ── Check if current user has already reviewed this product ───────────────
  const checkUserReview = async () => {
    try {
      setLoadingUserReview(true);
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/api/v1/review/user/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.review) {
        setUserReview(response.data.review);
        setRating(response.data.review.rating);
        setComment(response.data.review.comment);
      }
    } catch (error) {
      console.error('Error checking user review:', error);
    } finally {
      setLoadingUserReview(false);
    }
  };

  const checkReviewEligibility = async () => {
    try {
      setCheckingReviewEligibility(true);
      const token = await getToken();
      if (!token) {
        setCanReview(false);
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const deliveredOrders = response.data?.orders || [];
      const isEligible = deliveredOrders.some((order) =>
        order.orderStatus === 'Delivered'
        && order.orderItems?.some((item) => {
          const orderProductId = item.product?._id || item.product;
          return orderProductId?.toString() === productId;
        })
      );

      setCanReview(isEligible);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanReview(false);
    } finally {
      setCheckingReviewEligibility(false);
    }
  };

  // ── Calculate average rating ──────────────────────────────────────────────
  const getAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return sum / reviews.length;
  };

  const averageRating = getAverageRating();
  const displayedReviews = expandedReviews ? (reviews || []) : (reviews || []).slice(0, 3);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  // ── POST /api/v1/cart/add ─────────────────────────────────────────────────
  const handleAddToCart = async () => {
    try {
      setCartLoading(true);
      const token = await getToken();
      if (!token) { navigation.navigate('Login'); return; }

      const res = await axios.post(
        `${BACKEND_URL}/api/v1/cart/add`,
        { productId: product._id },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showToast(`✅ "${product.name}" added to cart!`);
      }
    } catch (e) {
      console.error('Error adding to cart:', e);
      showToast(`❌ ${e.response?.data?.message || e.message}`);
    } finally {
      setCartLoading(false);
    }
  };

  // ── Buy Now ───────────────────────────────────────────────────────────────
  const handleBuyNow = () => {
    navigation.navigate('Checkout', {
      productId: product._id,
      quantity: 1,
      product: {
        ...product,
        effectivePrice: product.isOnSale && product.discountedPrice ? product.discountedPrice : product.price
      },
    });
  };

  // ── Open review modal ─────────────────────────────────────────────────────
  const openReviewModal = () => {
    dismissKeyboard(); // Dismiss keyboard when opening review modal
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
    setReviewModalVisible(true);
  };

  // ── Submit review ─────────────────────────────────────────────────────────
  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a review comment');
      return;
    }

    const reviewData = {
      rating,
      comment,
      productId,
      existingReview: Boolean(userReview),
    };

    dispatch(createProductReview(productId, reviewData));
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || loadingProduct) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading card listing...</Text>
        </View>
      </UserDrawer>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!product || !product._id) {
    return (
      <UserDrawer>
        <View style={styles.centered}>
          <Icon name="search-off" size={64} color="#ccc" />
          <Text style={styles.notFoundText}>Product not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </UserDrawer>
    );
  }

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  // Determine which price to display
  const displayPrice = product.isOnSale && product.discountedPrice
    ? parseFloat(product.discountedPrice).toFixed(2)
    : parseFloat(product.price || 0).toFixed(2);

  const originalPrice = product.isOnSale && product.discountedPrice
    ? parseFloat(product.price).toFixed(2)
    : null;

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        {/* Main content with keyboard dismissal */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.productTopBar}>
              <TouchableOpacity style={styles.topRoundButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
                <Icon name="arrow-back" size={20} color={authColors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.productTopBarTitle}>Pack Details</Text>
              <TouchableOpacity style={styles.topRoundButton} onPress={handleAddToCart} activeOpacity={0.82}>
                <Icon name="shopping-bag" size={20} color={authColors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ImageCarousel images={product.images} />

            <View style={styles.detailsCard}>
              <View style={styles.chipRow}>
                <View style={styles.categoryChip}>
                  <Icon name="category" size={13} color="#FF6B6B" />
                  <Text style={styles.categoryChipText}>{product.category || 'Card Pack'}</Text>
                </View>
                {product.condition ? (
                  <View style={styles.categoryChip}>
                    <Icon name="verified" size={13} color="#FF6B6B" />
                    <Text style={styles.categoryChipText}>{product.condition}</Text>
                  </View>
                ) : null}
                {product.isOnSale && product.discountPercentage && (
                  <DiscountBadge percentage={product.discountPercentage} />
                )}
              </View>

              <Text style={styles.productName}>{product.name}</Text>

              {/* Price with discount display */}
              <View style={styles.priceContainer}>
                {originalPrice && (
                  <>
                    <Text style={styles.originalPrice}>₱{originalPrice}</Text>
                    {product.discountPercentage && (
                      <View style={styles.discountBadgeLarge}>
                        <Text style={styles.discountBadgeLargeText}>{product.discountPercentage}% OFF</Text>
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.productPrice}>₱{displayPrice}</Text>
              </View>

              {/* Show discount period if on sale */}
              {product.isOnSale && product.discountStartDate && product.discountEndDate && (
                <View style={styles.discountPeriodContainer}>
                  <Icon name="event" size={16} color="#e74c3c" />
                  <Text style={styles.discountPeriodText}>
                    Sale ends: {new Date(product.discountEndDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.priceStockRow}>
                <StockBadge stock={product.stock} />
              </View>

              {/* Reviews Summary Section */}
              {reviews && reviews.length > 0 && (
                <View style={styles.reviewsSummaryContainer}>
                  <View style={styles.reviewsSummaryHeader}>
                    <Text style={styles.reviewsSummaryTitle}>Customer Reviews</Text>
                    <TouchableOpacity
                      style={styles.viewAllReviewsButton}
                      onPress={() => setExpandedReviews(!expandedReviews)}
                    >
                      <Text style={styles.viewAllReviewsText}>
                        {expandedReviews ? 'Show Less' : `View All (${reviews.length})`}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.averageRatingContainer}>
                    <Text style={styles.averageRatingText}>{averageRating.toFixed(1)}</Text>
                    <StarRating rating={averageRating} size={18} showRating={false} />
                    <Text style={styles.totalReviewsText}>({reviews.length} reviews)</Text>
                  </View>
                </View>
              )}

              {checkingReviewEligibility ? (
                <View style={styles.reviewsLoader}>
                  <ActivityIndicator size="small" color="#FF6B6B" />
                  <Text style={styles.loadingReviewsText}>Checking review eligibility...</Text>
                </View>
              ) : canReview ? (
                <TouchableOpacity
                  style={styles.writeReviewButton}
                  onPress={openReviewModal}
                >
                  <Icon name="rate-review" size={20} color="white" />
                  <Text style={styles.writeReviewButtonText}>
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.reviewEligibilityCard}>
                  <Icon name="verified-user" size={18} color={authColors.sparkle} />
                  <Text style={styles.reviewEligibilityText}>
                    Reviews unlock after a delivered order for this pack.
                  </Text>
                </View>
              )}

              {/* Reviews List */}
              {loadingReviews ? (
                <View style={styles.reviewsLoader}>
                  <ActivityIndicator size="small" color="#FF6B6B" />
                  <Text style={styles.loadingReviewsText}>Loading reviews...</Text>
                </View>
              ) : (
                <>
                  {/* User's Review (if exists) */}
                  {userReview && (
                    <View style={styles.userReviewSection}>
                      <Text style={styles.sectionSubtitle}>Your Review</Text>
                      <ReviewItem review={userReview} isUserReview={true} />
                    </View>
                  )}

                  {/* Other Reviews */}
                  {displayedReviews.length > 0 && (
                    <View style={styles.reviewsList}>
                      {displayedReviews
                        .filter(r => !userReview || r._id !== userReview._id)
                        .map((review, index) => (
                          <ReviewItem key={index} review={review} />
                        ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Pack Details</Text>
              <Text style={styles.descriptionText}>
                {product.description || 'No pack description available for this store item.'}
              </Text>

              {(product.seller?.name || product.condition) && (
                <>
                  <View style={styles.divider} />
                  {product.condition && (
                    <View style={styles.infoRow}>
                      <Icon name="grade" size={18} color="#FF6B6B" />
                      <Text style={styles.infoLabel}>Condition</Text>
                      <Text style={styles.infoValue}>{product.condition}</Text>
                    </View>
                  )}
                  {product.seller?.name && (
                    <View style={styles.infoRow}>
                      <Icon name="storefront" size={18} color="#FF6B6B" />
                      <Text style={styles.infoLabel}>Store</Text>
                      <Text style={styles.infoValue}>{product.seller.name}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 120 }} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <Toast message={toastMessage} opacity={toastOpacity} />

        {/* Review Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reviewModalVisible}
          onRequestClose={() => {
            setReviewModalVisible(false);
            dismissKeyboard();
          }}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.reviewModalContainer}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.reviewModalContent}
              >
                <View style={styles.reviewModalHeader}>
                <Text style={styles.reviewModalTitle}>
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setReviewModalVisible(false);
                    dismissKeyboard();
                  }}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.reviewProductInfo}>
                  <View style={styles.reviewProductImageContainer}>
                    {product.images && product.images.length > 0 ? (
                      <Image
                        source={{ uri: product.images[0].url || product.images[0] }}
                        style={styles.reviewProductImage}
                      />
                    ) : (
                      <View style={styles.reviewProductImagePlaceholder}>
                        <Icon name="image" size={24} color="#ccc" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.reviewProductName}>{product.name}</Text>
                </View>

                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <StarRating
                    rating={rating}
                    size={30}
                    interactive={true}
                    onRate={setRating}
                  />
                </View>

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Your Review</Text>
                  <TextInput
                    style={styles.commentInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your experience with this pack..."
                    value={comment}
                    onChangeText={setComment}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitReviewButton, submittingReview && styles.submitButtonDisabled]}
                  onPress={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitReviewText}>
                      {userReview ? 'Update Review' : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.cartButton, isOutOfStock && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={isOutOfStock || cartLoading}
            activeOpacity={0.8}
          >
            {cartLoading ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <>
                <Icon name="add-shopping-cart" size={22} color="#FF6B6B" />
                <Text style={styles.cartButtonText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buyButton, isOutOfStock && styles.disabledButton]}
            onPress={handleBuyNow}
            disabled={isOutOfStock || buyLoading}
            activeOpacity={0.8}
          >
            {buyLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="bolt" size={22} color="white" />
                <Text style={styles.buyButtonText}>{isOutOfStock ? 'Out of Stock' : 'Buy Pack'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: authColors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: authColors.background, gap: 12 },
  loadingText: { fontSize: 15, color: authColors.textMuted, marginTop: 8, fontFamily: authFonts.regular },
  notFoundText: { fontSize: 18, color: authColors.textPrimary, marginTop: 12, fontFamily: authFonts.bold },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: authColors.accent, borderRadius: 25 },
  backBtnText: { color: 'white', fontFamily: authFonts.semibold, fontSize: 15 },
  scrollView: { flex: 1 },
  productTopBar: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRoundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  productTopBarTitle: {
    color: authColors.textPrimary,
    fontSize: 16,
    fontFamily: authFonts.semibold,
  },
  toast: {
    position: 'absolute', bottom: 90, left: 20, right: 20,
    backgroundColor: 'rgba(30,30,30,0.88)',
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 12, alignItems: 'center',
    zIndex: 999, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  toastText: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  carouselContainer: { backgroundColor: 'transparent', marginHorizontal: 16, borderRadius: 28, overflow: 'hidden' },
  mainImage: { width: SCREEN_WIDTH - 32, height: IMAGE_HEIGHT },
  noImageBox: { width: SCREEN_WIDTH - 32, height: IMAGE_HEIGHT, backgroundColor: authColors.surface, justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: authColors.textMuted, fontSize: 14, marginTop: 8, fontFamily: authFonts.regular },
  imageCounter: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  imageCounterText: { color: 'white', fontSize: 13, fontWeight: '600' },
  arrowLeft: {
    position: 'absolute', left: 10, top: IMAGE_HEIGHT / 2 - 22,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowRight: {
    position: 'absolute', right: 10, top: IMAGE_HEIGHT / 2 - 22,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  arrowText: { color: 'white', fontSize: 30, fontWeight: 'bold', lineHeight: 36 },
  dotsContainer: { position: 'absolute', bottom: 70, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3 },
  dotActive: { backgroundColor: authColors.accentSoft, width: 10, height: 10 },
  thumbnailStrip: { backgroundColor: 'rgba(255,255,255,0.04)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  thumbnailContent: { paddingHorizontal: 12, paddingVertical: 10 },
  thumbnail: { width: 60, height: 60, borderRadius: 12, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbnailActive: { borderColor: authColors.accentSoft },
  detailsCard: {
    backgroundColor: authColors.surface, borderRadius: 28,
    marginHorizontal: 16, marginTop: 16, paddingHorizontal: 20, paddingTop: 24,
    borderWidth: 1, borderColor: authColors.surfaceBorder,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(124, 58, 237, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  categoryChipText: { fontSize: 12, color: authColors.accentSoft, fontFamily: authFonts.semibold, marginLeft: 4 },
  discountBadge: {
    backgroundColor: authColors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productName: { fontSize: 22, color: authColors.textPrimary, marginBottom: 12, lineHeight: 30, fontFamily: authFonts.bold },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  productPrice: { fontSize: 28, color: authColors.textPrimary, fontFamily: authFonts.bold },
  originalPrice: {
    fontSize: 18,
    color: authColors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadgeLarge: {
    backgroundColor: authColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 10,
  },
  discountBadgeLargeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  discountPeriodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  discountPeriodText: {
    marginLeft: 8,
    fontSize: 14,
    color: authColors.textMuted,
    fontFamily: authFonts.semibold,
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16
  },
  stockBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  stockIn: { backgroundColor: 'rgba(74, 222, 128, 0.14)' },
  stockOut: { backgroundColor: 'rgba(248, 113, 113, 0.14)' },
  stockText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  stockTextIn: { color: '#2e7d32' },
  stockTextOut: { color: '#c62828' },

  // Review-related styles
  reviewsSummaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  reviewsSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsSummaryTitle: {
    fontSize: 16,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  viewAllReviewsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllReviewsText: {
    fontSize: 12,
    color: authColors.accentSoft,
    fontFamily: authFonts.semibold,
  },
  reviewEligibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 226, 168, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(244, 226, 168, 0.18)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    gap: 10,
  },
  reviewEligibilityText: {
    flex: 1,
    color: authColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: authFonts.regular,
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  averageRatingText: {
    fontSize: 24,
    fontWeight: '800',
    color: authColors.textPrimary,
  },
  totalReviewsText: {
    fontSize: 14,
    color: authColors.textMuted,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.accent,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  writeReviewButtonText: {
    fontSize: 16,
    fontFamily: authFonts.semibold,
    color: 'white',
  },
  reviewsLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingReviewsText: {
    fontSize: 14,
    color: authColors.textMuted,
  },
  userReviewSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
    marginBottom: 8,
  },
  reviewsList: {
    gap: 12,
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 12,
  },
  userReviewItem: {
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderColor: authColors.accent,
    borderWidth: 1.5,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: authColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.textPrimary,
  },
  reviewDate: {
    fontSize: 10,
    color: authColors.textMuted,
  },
  reviewComment: {
    fontSize: 14,
    color: authColors.textMuted,
    lineHeight: 20,
    marginTop: 8,
  },
  starRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Review Modal Styles
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 4, 20, 0.76)',
  },
  reviewModalContent: {
    backgroundColor: '#1A0E2F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: authColors.textPrimary,
  },
  reviewProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  reviewProductImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  reviewProductImage: {
    width: '100%',
    height: '100%',
  },
  reviewProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reviewProductName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: authColors.textPrimary,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.textPrimary,
    marginBottom: 8,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.textPrimary,
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: authColors.textPrimary,
    backgroundColor: authColors.surfaceStrong,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: authColors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewText: {
    fontSize: 16,
    fontFamily: authFonts.semibold,
    color: 'white',
  },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  sectionTitle: { fontSize: 16, color: authColors.textPrimary, marginBottom: 8, fontFamily: authFonts.semibold },
  descriptionText: { fontSize: 15, color: authColors.textMuted, lineHeight: 24, fontFamily: authFonts.regular },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: authColors.textMuted, flex: 0.3, marginLeft: 8, fontFamily: authFonts.regular },
  infoValue: { fontSize: 14, color: authColors.textPrimary, flex: 0.7, fontFamily: authFonts.semibold },
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 20,
    backgroundColor: '#160B29', borderTopWidth: 1, borderTopColor: authColors.surfaceBorder, gap: 10,
  },
  cartButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: authColors.surfaceBorder, gap: 8,
  },
  cartButtonText: { fontSize: 15, color: authColors.accentSoft, marginLeft: 6, fontFamily: authFonts.bold },
  buyButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent, paddingVertical: 14, borderRadius: 14, gap: 8,
  },
  buyButtonText: { fontSize: 15, color: 'white', marginLeft: 6, fontFamily: authFonts.bold },
  disabledButton: { opacity: 0.45 },
});
