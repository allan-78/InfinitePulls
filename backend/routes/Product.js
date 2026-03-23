const express = require('express');
const { upload } = require('../utils/Multer');
const {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  softDeleteProduct,
  getDeletedProducts,
  restoreProduct,
  getProductReviews,
  getProductsOnSale,
  getDiscountNotifications,
  getMyListings,
} = require('../controllers/Product');

const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/products', getAllProducts);
router.get('/products/:id', getProduct);
router.get('/product/:id', getProduct);
router.get('/products/sale/active', getProductsOnSale);
router.get('/notifications/discounts', isAuthenticatedUser, getDiscountNotifications);

router.get('/my/listings', isAuthenticatedUser, isAdmin, getMyListings);
router.post('/listings', isAuthenticatedUser, isAdmin, upload.array('images', 5), createProduct);
router.put('/listings/:id', isAuthenticatedUser, isAdmin, upload.array('images', 5), updateProduct);
router.delete('/listings/:id', isAuthenticatedUser, isAdmin, softDeleteProduct);

router.get('/admin/products/trash', isAuthenticatedUser, isAdmin, getDeletedProducts);
router.patch('/admin/products/restore/:id', isAuthenticatedUser, isAdmin, restoreProduct);
router.get('/admin/products/:id', isAuthenticatedUser, isAdmin, getProduct);
router.get('/admin/products/:productId/reviews', isAuthenticatedUser, isAdmin, getProductReviews);
router.post('/admin/products', isAuthenticatedUser, isAdmin, upload.array('images', 5), createProduct);
router.put('/admin/products/:id', isAuthenticatedUser, isAdmin, upload.array('images', 5), updateProduct);
router.delete('/admin/products/:id', isAuthenticatedUser, isAdmin, softDeleteProduct);
router.delete('/admin/products/delete/:id', isAuthenticatedUser, isAdmin, deleteProduct);

module.exports = router;
