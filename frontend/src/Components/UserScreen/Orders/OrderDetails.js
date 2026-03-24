// CVPetShop/frontend/src/Components/UserScreen/Orders/OrderDetails.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getToken } from '../../../utils/helper';
import UserDrawer from '../UserDrawer';
import { authColors, authFonts } from '../../../theme/authTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Status color mapping - Updated to match your model's enum values
const STATUS_COLORS = {
  'Processing': authColors.sparkle,
  'Accepted': authColors.accentSoft,
  'Out for Delivery': authColors.accent,
  'Delivered': authColors.success,
  'Cancelled': authColors.danger,
};

// Status step mapping for timeline - Updated to match your workflow
const STATUS_STEPS = ['Processing', 'Accepted', 'Out for Delivery', 'Delivered'];

export default function OrderDetails({ navigation, route }) {
  const { orderId, order: initialOrder } = route.params;
  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Review states
  const [reviews, setReviews] = useState({});
  const [userReviews, setUserReviews] = useState({});
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState({});

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (!initialOrder) {
      fetchOrderDetails();
    } else {
      // If order is delivered, fetch reviews for all products
      if (initialOrder.orderStatus === 'Delivered') {
        fetchAllProductReviews();
      }
    }
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrderDetails();
    });

    return unsubscribe;
  }, [navigation, orderId]);

  useEffect(() => {
    // When order is updated and delivered, fetch reviews
    if (order && order.orderStatus === 'Delivered' && order.orderItems) {
      fetchAllProductReviews();
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const response = await axios.get(`${BACKEND_URL}/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setOrder(response.data.order);
        // If order is delivered, fetch reviews
        if (response.data.order.orderStatus === 'Delivered') {
          fetchAllProductReviews();
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductReviews = async () => {
    if (!order || !order.orderItems) return;
    
    const token = await getToken();
    if (!token) return;

    // Fetch reviews for each product in the order
    for (const item of order.orderItems) {
      const productId = item.product?._id || item.product;
      if (productId) {
        fetchProductReviews(productId);
        fetchUserProductReview(productId);
      }
    }
  };

  const fetchProductReviews = async (productId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/reviews?productId=${productId}`);
      if (response.data.success) {
        setReviews(prev => ({ ...prev, [productId]: response.data.reviews }));
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    }
  };

  const fetchUserProductReview = async (productId) => {
    try {
      setLoadingReviews(prev => ({ ...prev, [productId]: true }));
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/api/v1/review/user/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.review) {
        setUserReviews(prev => ({ ...prev, [productId]: response.data.review }));
      }
    } catch (error) {
      console.error('Error fetching user review:', error);
    } finally {
      setLoadingReviews(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleTrackOrder = () => {
    Alert.alert('Not Available', 'Tracking information is not available yet.');
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return STATUS_STEPS.indexOf(order.orderStatus);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openImageModal = (imageUri) => {
    dismissKeyboard(); // Dismiss keyboard when opening image modal
    setSelectedImage(imageUri);
    setModalVisible(true);
  };

  const getProductImage = (item) => {
    // First check if the item has a direct image field (from order)
    if (item.image) {
      return item.image;
    }
    // Then check if the product is populated and has images
    if (item.product && item.product.images && item.product.images.length > 0) {
      return item.product.images[0].url || item.product.images[0];
    }
    return null;
  };

  const getAllProductImages = (item) => {
    const images = [];
    
    // Add the order item image if available
    if (item.image) {
      images.push(item.image);
    }
    
    // Add all product images if the product is populated
    if (item.product && item.product.images && item.product.images.length > 0) {
      item.product.images.forEach(img => {
        const imageUrl = img.url || img;
        if (!images.includes(imageUrl)) {
          images.push(imageUrl);
        }
      });
    }
    
    return images;
  };

  const openReviewModal = (product) => {
    dismissKeyboard(); // Dismiss keyboard when opening review modal
    const productId = product.product?._id || product.product;
    const existingReview = userReviews[productId];
    
    setSelectedProduct(product);
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
    setReviewModalVisible(true);
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = await getToken();
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const productId = selectedProduct.product?._id || selectedProduct.product;
      const existingReview = userReviews[productId];
      
      const reviewData = {
        rating,
        comment,
        productId,
        orderId: order._id,
      };

      let response;
      if (existingReview) {
        // Update existing review
        response = await axios.put(`${BACKEND_URL}/api/v1/review/update`, reviewData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new review
        response = await axios.post(`${BACKEND_URL}/api/v1/review/create`, reviewData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        Alert.alert(
          'Success',
          existingReview ? 'Review updated successfully!' : 'Review submitted successfully!'
        );
        setReviewModalVisible(false);
        dismissKeyboard(); // Dismiss keyboard after submission
        // Refresh reviews
        fetchProductReviews(productId);
        fetchUserProductReview(productId);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (ratingValue, interactive = false, size = 20) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={interactive ? () => setRating(i) : null}
          disabled={!interactive}
        >
          <Icon
            name={i <= ratingValue ? 'star' : 'star-border'}
            size={size}
            color={i <= ratingValue ? '#FFD700' : '#ccc'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderReviewSection = (item) => {
    const productId = item.product?._id || item.product;
    if (!productId) return null;

    const productReviews = reviews[productId] || [];
    const userReview = userReviews[productId];
    const averageRating = productReviews.length > 0
      ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
      : 0;

    return (
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Product Reviews</Text>
          {userReview ? (
            <TouchableOpacity
              style={styles.editReviewButton}
              onPress={() => openReviewModal(item)}
            >
              <Icon name="edit" size={16} color={authColors.accentSoft} />
              <Text style={styles.editReviewText}>Edit Your Review</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => openReviewModal(item)}
            >
              <Icon name="rate-review" size={16} color={authColors.textPrimary} />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Average Rating */}
        {productReviews.length > 0 && (
          <View style={styles.averageRatingContainer}>
            <View style={styles.averageRatingRow}>
              <Text style={styles.averageRatingText}>{averageRating}</Text>
              <View style={styles.averageStars}>
                {renderStars(Math.round(averageRating), false, 16)}
              </View>
              <Text style={styles.totalReviews}>({productReviews.length} reviews)</Text>
            </View>
          </View>
        )}

        {/* User's Review (if exists) */}
        {userReview && (
          <View style={styles.userReviewContainer}>
            <Text style={styles.yourReviewLabel}>Your Review:</Text>
            <View style={styles.userReviewContent}>
              <View style={styles.userReviewStars}>
                {renderStars(userReview.rating, false, 16)}
              </View>
              <Text style={styles.userReviewComment}>{userReview.comment}</Text>
              <Text style={styles.userReviewDate}>
                {formatDate(userReview.createdAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Other Reviews */}
        {productReviews.length > 0 && (
          <View style={styles.otherReviewsContainer}>
            <Text style={styles.otherReviewsTitle}>
              {userReview ? 'Other Customer Reviews' : 'Customer Reviews'}
            </Text>
            {productReviews
              .filter(r => !userReview || r._id !== userReview._id)
              .slice(0, 2)
              .map((review, index) => (
                <View key={index} style={styles.otherReviewItem}>
                  <View style={styles.otherReviewHeader}>
                    <Text style={styles.reviewerName}>{review.name}</Text>
                    <View style={styles.reviewerStars}>
                      {renderStars(review.rating, false, 12)}
                    </View>
                  </View>
                  <Text style={styles.reviewerComment}>{review.comment}</Text>
                  <Text style={styles.reviewerDate}>
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
              ))}
            {productReviews.length > 2 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all {productReviews.length} reviews</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </UserDrawer>
    );
  }

  if (error || !order) {
    return (
      <UserDrawer>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={80} color={authColors.textMuted} />
            <Text style={styles.errorTitle}>Order Not Found</Text>
            <Text style={styles.errorText}>
              {error || "The order you're looking for doesn't exist or has been removed."}
            </Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </UserDrawer>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        {/* Image Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={30} color={authColors.textPrimary} />
            </TouchableOpacity>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

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
                    {userReviews[selectedProduct?.product?._id || selectedProduct?.product] 
                      ? 'Edit Your Review' 
                      : 'Write a Review'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setReviewModalVisible(false);
                    dismissKeyboard();
                  }}>
                    <Icon name="close" size={24} color={authColors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {selectedProduct && (
                  <View style={styles.reviewProductInfo}>
                    <View style={styles.reviewProductImageContainer}>
                      {getProductImage(selectedProduct) ? (
                        <Image 
                          source={{ uri: getProductImage(selectedProduct) }} 
                          style={styles.reviewProductImage} 
                        />
                      ) : (
                        <View style={styles.reviewProductImagePlaceholder}>
                          <Icon name="image" size={24} color={authColors.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewProductName}>{selectedProduct.name}</Text>
                  </View>
                )}

                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  <View style={styles.starsContainer}>
                    {renderStars(rating, true, 30)}
                  </View>
                </View>

                <View style={styles.commentContainer}>
                  <Text style={styles.commentLabel}>Your Review</Text>
                  <TextInput
                    style={styles.commentInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your experience with this product..."
                    placeholderTextColor={authColors.textMuted}
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
                    <ActivityIndicator size="small" color={authColors.textPrimary} />
                  ) : (
                    <Text style={styles.submitReviewText}>
                      {userReviews[selectedProduct?.product?._id || selectedProduct?.product] 
                        ? 'Update Review' 
                        : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        {/* Main content with keyboard dismissal */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={authColors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Order Details</Text>
                <Text style={styles.orderId}>
                  #{order.orderNumber || order._id?.slice(-8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.orderStatus] || authColors.textMuted }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[order.orderStatus] || authColors.textMuted }]}>
                  {order.orderStatus}
                </Text>
              </View>
            </View>

            {/* Order Timeline - Only show for non-cancelled orders */}
            {order.orderStatus !== 'Cancelled' && (
              <View style={styles.timelineContainer}>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={styles.timeline}>
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const hasPrevious = index > 0;
                    const hasNext = index < STATUS_STEPS.length - 1;
                    const isPreviousCompleted = index - 1 <= currentStepIndex;
                    
                    return (
                      <View key={step} style={styles.timelineStep}>
                        <View style={styles.timelineMarkerRow}>
                          {hasPrevious && (
                            <View
                              style={[
                                styles.timelineHalfLine,
                                isPreviousCompleted && styles.timelineLineCompleted,
                              ]}
                            />
                          )}
                          <View style={[
                            styles.timelineDot,
                            isCompleted && styles.timelineDotCompleted,
                            isCurrent && styles.timelineDotCurrent,
                          ]}>
                            {isCompleted && <Icon name="check" size={12} color={authColors.textPrimary} />}
                          </View>
                          {hasNext && (
                            <View
                              style={[
                                styles.timelineHalfLine,
                                isCompleted && styles.timelineLineCompleted,
                              ]}
                            />
                          )}
                        </View>
                        <Text style={[
                          styles.timelineText,
                          isCompleted && styles.timelineTextCompleted,
                        ]}>
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Cancelled Order Message */}
            {order.orderStatus === 'Cancelled' && (
              <View style={styles.cancelledContainer}>
                <Icon name="cancel" size={24} color={authColors.danger} />
                <Text style={styles.cancelledText}>This order has been cancelled</Text>
              </View>
            )}

            {/* Order Items with Multiple Images and Reviews */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {order.orderItems?.map((item, index) => {
                const productImages = getAllProductImages(item);
                const mainImage = getProductImage(item);
                
                return (
                  <View key={index} style={styles.orderItemContainer}>
                    <View style={styles.orderItem}>
                      <TouchableOpacity 
                        style={styles.itemImageContainer}
                        onPress={() => mainImage && openImageModal(mainImage)}
                      >
                        {mainImage ? (
                          <Image source={{ uri: mainImage }} style={styles.itemImage} />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Icon name="image" size={24} color={authColors.textMuted} />
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>PHP {item.price?.toFixed(2)}</Text>
                        <View style={styles.itemQuantityRow}>
                          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                          <Text style={styles.itemSubtotal}>
                            Subtotal: PHP {(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* All Product Images */}
                    {productImages.length > 1 && (
                      <View style={styles.allImagesContainer}>
                        <Text style={styles.allImagesTitle}>All Product Images:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {productImages.map((imageUri, imgIndex) => (
                            <TouchableOpacity
                              key={imgIndex}
                              style={styles.thumbnailContainer}
                              onPress={() => openImageModal(imageUri)}
                            >
                              <Image source={{ uri: imageUri }} style={styles.thumbnail} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Reviews Section - Only show if order is delivered */}
                    {order.orderStatus === 'Delivered' && renderReviewSection(item)}
                  </View>
                );
              })}
            </View>

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Price</Text>
                <Text style={styles.summaryValue}>PHP {order.itemsPrice?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Price</Text>
                <Text style={styles.summaryValue}>PHP {order.shippingPrice?.toFixed(2) || '0.00'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax Price</Text>
                <Text style={styles.summaryValue}>PHP {order.taxPrice?.toFixed(2) || '0.00'}</Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>PHP {order.totalPrice?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            {/* Shipping Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shipping Information</Text>
              
              <View style={styles.infoRow}>
                <Icon name="location-on" size={18} color={authColors.accentSoft} />
                <Text style={styles.infoText}>
                  {order.shippingInfo?.address}, {order.shippingInfo?.city}, {' '}
                  {order.shippingInfo?.postalCode}, {order.shippingInfo?.country}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="phone" size={18} color={authColors.accentSoft} />
                <Text style={styles.infoText}>{order.shippingInfo?.phoneNo || 'N/A'}</Text>
              </View>
            </View>

            {/* Order Dates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Timeline</Text>
              
              <View style={styles.dateRow}>
                <Icon name="event" size={16} color={authColors.textMuted} />
                <Text style={styles.dateLabel}>Order Placed:</Text>
                <Text style={styles.dateValue}>{formatDate(order.createdAt)}</Text>
              </View>
              
              {order.deliveredAt && (
                <View style={styles.dateRow}>
                  <Icon name="check-circle" size={16} color={authColors.success} />
                  <Text style={styles.dateLabel}>Delivered:</Text>
                  <Text style={styles.dateValue}>{formatDate(order.deliveredAt)}</Text>
                </View>
              )}
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 30 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
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
    backgroundColor: authColors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: authColors.background,
  },
  errorTitle: {
    fontSize: 20,
    color: authColors.textPrimary,
    marginTop: 16,
    fontFamily: authFonts.bold,
  },
  errorText: {
    fontSize: 14,
    color: authColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
    fontFamily: authFonts.regular,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: authColors.accentSoft,
    fontSize: 16,
    fontFamily: authFonts.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    color: authColors.textPrimary,
    fontFamily: authFonts.bold,
  },
  orderId: {
    fontSize: 12,
    color: authColors.textMuted,
    marginTop: 2,
    fontFamily: authFonts.regular,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  section: {
    backgroundColor: authColors.surface,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 15,
    color: authColors.textPrimary,
    marginBottom: 10,
    fontFamily: authFonts.bold,
  },
  timelineContainer: {
    backgroundColor: authColors.surface,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  timelineMarkerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: authColors.surfaceStrong,
    borderWidth: 2,
    borderColor: authColors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  timelineDotCompleted: {
    backgroundColor: authColors.success,
    borderColor: authColors.success,
  },
  timelineDotCurrent: {
    borderColor: authColors.accentSoft,
    borderWidth: 3,
  },
  timelineText: {
    fontSize: 11,
    color: authColors.textMuted,
    textAlign: 'center',
    fontFamily: authFonts.regular,
  },
  timelineTextCompleted: {
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  timelineHalfLine: {
    flex: 1,
    height: 2,
    backgroundColor: authColors.surfaceBorder,
  },
  timelineLineCompleted: {
    backgroundColor: authColors.success,
  },
  cancelledContainer: {
    backgroundColor: 'rgba(224, 122, 106, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(224, 122, 106, 0.22)',
  },
  cancelledText: {
    color: authColors.danger,
    fontSize: 14,
    fontFamily: authFonts.semibold,
    marginLeft: 8,
  },
  orderItemContainer: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: authColors.surfaceBorder,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 8,
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 16,
    padding: 10,
  },
  itemImageContainer: {
    width: 66,
    height: 66,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: authColors.surfaceStrong,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authColors.surfaceStrong,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    minHeight: 66,
  },
  itemName: {
    fontSize: 14,
    color: authColors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: authFonts.semibold,
  },
  itemPrice: {
    fontSize: 13,
    color: authColors.accentSoft,
    marginBottom: 6,
    fontFamily: authFonts.semibold,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemQuantity: {
    fontSize: 11,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  itemSubtotal: {
    fontSize: 11,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
    textAlign: 'right',
  },
  allImagesContainer: {
    marginTop: 8,
    marginLeft: 78,
  },
  allImagesTitle: {
    fontSize: 11,
    color: authColors.textMuted,
    marginBottom: 5,
    fontFamily: authFonts.semibold,
  },
  thumbnailContainer: {
    marginRight: 8,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  thumbnail: {
    width: 44,
    height: 44,
  },
  // Review Styles
  reviewSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: authColors.surfaceBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 13,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  writeReviewText: {
    fontSize: 11,
    color: authColors.textPrimary,
    marginLeft: 4,
    fontFamily: authFonts.semibold,
  },
  editReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(199, 104, 91, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  editReviewText: {
    fontSize: 11,
    color: authColors.accentSoft,
    marginLeft: 4,
    fontFamily: authFonts.semibold,
  },
  averageRatingContainer: {
    marginBottom: 12,
  },
  averageRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRatingText: {
    fontSize: 18,
    color: authColors.textPrimary,
    marginRight: 8,
    fontFamily: authFonts.bold,
  },
  averageStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  totalReviews: {
    fontSize: 12,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  userReviewContainer: {
    backgroundColor: authColors.panel,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  yourReviewLabel: {
    fontSize: 12,
    color: authColors.textMuted,
    marginBottom: 4,
    fontFamily: authFonts.semibold,
  },
  userReviewContent: {
    marginLeft: 4,
  },
  userReviewStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  userReviewComment: {
    fontSize: 13,
    color: authColors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: authFonts.regular,
  },
  userReviewDate: {
    fontSize: 10,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  otherReviewsContainer: {
    marginTop: 8,
  },
  otherReviewsTitle: {
    fontSize: 13,
    color: authColors.textMuted,
    marginBottom: 8,
    fontFamily: authFonts.semibold,
  },
  otherReviewItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: authColors.surfaceBorder,
  },
  otherReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  reviewerStars: {
    flexDirection: 'row',
  },
  reviewerComment: {
    fontSize: 12,
    color: authColors.textMuted,
    lineHeight: 16,
    marginBottom: 4,
    fontFamily: authFonts.regular,
  },
  reviewerDate: {
    fontSize: 10,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: authColors.accentSoft,
    fontFamily: authFonts.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: authColors.textMuted,
    fontFamily: authFonts.regular,
  },
  summaryValue: {
    fontSize: 13,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  discountValue: {
    color: authColors.success,
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: authColors.surfaceBorder,
  },
  totalLabel: {
    fontSize: 15,
    color: authColors.textPrimary,
    fontFamily: authFonts.bold,
  },
  totalValue: {
    fontSize: 16,
    color: authColors.accentSoft,
    fontFamily: authFonts.bold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: authColors.textPrimary,
    marginLeft: 8,
    lineHeight: 18,
    fontFamily: authFonts.regular,
  },
  paymentStatus: {
    fontFamily: authFonts.semibold,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dateLabel: {
    fontSize: 12,
    color: authColors.textMuted,
    marginLeft: 6,
    marginRight: 4,
    fontFamily: authFonts.regular,
  },
  dateValue: {
    flex: 1,
    fontSize: 12,
    color: authColors.textPrimary,
    fontFamily: authFonts.regular,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 5, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  // Review Modal Styles
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 6, 5, 0.66)',
  },
  reviewModalContent: {
    backgroundColor: authColors.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: authColors.surfaceBorder,
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
    color: authColors.textPrimary,
    fontFamily: authFonts.bold,
  },
  reviewProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: authColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
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
    backgroundColor: authColors.surfaceStrong,
  },
  reviewProductName: {
    flex: 1,
    fontSize: 14,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 14,
    color: authColors.textPrimary,
    marginBottom: 8,
    fontFamily: authFonts.semibold,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    color: authColors.textPrimary,
    marginBottom: 8,
    fontFamily: authFonts.semibold,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    color: authColors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: authColors.surfaceStrong,
    fontFamily: authFonts.regular,
  },
  submitReviewButton: {
    backgroundColor: authColors.accent,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitReviewText: {
    fontSize: 16,
    color: authColors.textPrimary,
    fontFamily: authFonts.semibold,
  },
});

