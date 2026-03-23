const Review = require("../models/Review");
const Product = require("../models/Product");

const buildFormattedReview = (review) => {
  const userName = review.user?.name || "Deleted User";
  const userEmail = review.user?.email || "";
  const userAvatar = review.user?.avatar?.url || "";
  const userContact = review.user?.contact || "";
  const userRole = review.user?.role || "user";

  return {
    _id: review._id,
    productId: review.product?._id,
    productName: review.product?.name || "Deleted Product",
    userId: review.user?._id || null,
    user: userName,
    userEmail,
    userAvatar,
    userContact,
    userRole,
    userProfile: {
      _id: review.user?._id || null,
      name: userName,
      email: userEmail,
      avatar: { url: userAvatar },
      contact: userContact,
      role: userRole,
    },
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    isActive: review.isActive,
    isDeleted: !review.isActive,
  };
};

// ✅ Get all active reviews from all products
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true })
      .populate("user", "name email avatar contact role")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    const formattedReviews = reviews.map((review) =>
      buildFormattedReview(review),
    );

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// ✅ Soft delete a review by review ID
exports.softDeleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isActive: false },
      { new: true },
    );

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    // Update product ratings
    await updateProductRatings(review.product);

    res
      .status(200)
      .json({ success: true, message: "Review soft-deleted successfully" });
  } catch (error) {
    console.error("Error soft deleting review:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to soft delete review" });
  }
};

// ✅ Restore a soft-deleted review
exports.restoreReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isActive: true },
      { new: true },
    );

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    // Update product ratings
    await updateProductRatings(review.product);

    res
      .status(200)
      .json({ success: true, message: "Review restored successfully" });
  } catch (error) {
    console.error("Error restoring review:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to restore review" });
  }
};

// ✅ Get all soft-deleted reviews
exports.getDeletedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: false })
      .populate("user", "name email avatar contact role")
      .populate("product", "name")
      .sort({ createdAt: -1 });

    const formattedReviews = reviews.map((review) =>
      buildFormattedReview(review),
    );

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Error fetching deleted reviews:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch deleted reviews" });
  }
};

// ✅ Permanently delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Update product ratings
    await updateProductRatings(productId);

    res
      .status(200)
      .json({ success: true, message: "Review permanently deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete review" });
  }
};

// Helper function to update product ratings
const updateProductRatings = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) return;

    const reviews = await Review.find({ product: productId, isActive: true });
    product.numOfReviews = reviews.length;
    product.ratings =
      reviews.length > 0
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length
        : 0;

    await product.save();
  } catch (error) {
    console.error("Error updating product ratings:", error);
  }
};

// ✅ Get single review details
exports.getReviewDetails = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate("user", "name email avatar contact role")
      .populate("product", "name");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const formattedReview = buildFormattedReview(review);

    res.status(200).json({
      success: true,
      review: formattedReview,
    });
  } catch (error) {
    console.error("Error fetching review details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review details",
      error: error.message,
    });
  }
};
