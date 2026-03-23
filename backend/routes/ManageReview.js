const express = require("express");
const router = express.Router();

const {
  getAllReviews,
  getDeletedReviews,
  softDeleteReview,
  restoreReview,
  deleteReview,
  getReviewDetails,
} = require("../controllers/ManageReview");

const { isAuthenticatedUser, isAdmin } = require("../middlewares/auth");

router.get("/admin/reviews/deleted", isAuthenticatedUser, isAdmin, getDeletedReviews);
router.get("/admin/reviews", isAuthenticatedUser, isAdmin, getAllReviews);

router.get("/admin/reviews/:reviewId", isAuthenticatedUser, isAdmin, getReviewDetails);
router.patch("/admin/reviews/softdelete/:reviewId", isAuthenticatedUser, isAdmin, softDeleteReview);
router.patch("/admin/reviews/restore/:reviewId", isAuthenticatedUser, isAdmin, restoreReview);
router.delete("/admin/reviews/delete/:reviewId", isAuthenticatedUser, isAdmin, deleteReview);

module.exports = router;