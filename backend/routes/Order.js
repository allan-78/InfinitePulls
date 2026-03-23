// backend/routes/Order.js
const express = require("express");
const router = express.Router();
const { getMyOrders, getOrderById } = require("../controllers/Order");
const { isAuthenticatedUser } = require("../middlewares/auth");

router.get("/me", isAuthenticatedUser, getMyOrders);
router.get("/:id", isAuthenticatedUser, getOrderById);

module.exports = router;