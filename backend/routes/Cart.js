// PetShop/backend/routes/Cart.js
const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/Cart');

const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

// Cart routes  ← no more /cart prefix, app.js already handles that
router.post('/add',               isAuthenticatedUser, addToCart);
router.get('/',                   isAuthenticatedUser, getCart);
router.patch('/update',           isAuthenticatedUser, updateCartItem);
router.delete('/remove/:productId', isAuthenticatedUser, removeCartItem);
router.delete('/clear',           isAuthenticatedUser, clearCart);
router.delete('/remove-all',      isAuthenticatedUser, clearCart);

module.exports = router;