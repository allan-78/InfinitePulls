// backend/routes/SalesAnalyticsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getMonthlySales,
  getSalesWithDateRange,
  getProductSales,
  getSalesStatistics,
  getRecentBuyers
} = require("../controllers/SalesAnalytics");
const { isAuthenticatedUser, isAdmin } = require('../middlewares/auth');

// Get monthly/yearly sales data
router.get("/sales/monthly", isAuthenticatedUser, isAdmin, getMonthlySales);

// Get sales data with custom date range
router.get("/sales/date-range", isAuthenticatedUser, isAdmin, getSalesWithDateRange);

// Get product sales for pie chart
router.get("/sales/products", isAuthenticatedUser, isAdmin, getProductSales);

// Get sales statistics
router.get("/sales/statistics", isAuthenticatedUser, isAdmin, getSalesStatistics);

router.get("/sales/recent-buyers", isAuthenticatedUser, isAdmin, getRecentBuyers);


module.exports = router;