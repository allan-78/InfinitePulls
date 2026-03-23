// backend/routes/Checkout.js
const express = require('express');
const { 
    checkout,
    soloCheckout,
} = require('../controllers/Checkout');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

// Fix: Remove the extra '/checkout' from the paths
router.post('/', isAuthenticatedUser, checkout);           // This becomes /api/v1/checkout/
router.post('/solo', isAuthenticatedUser, soloCheckout);   // This becomes /api/v1/checkout/solo

module.exports = router;