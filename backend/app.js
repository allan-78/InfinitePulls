const express = require('express');
const cors = require('cors');

const app = express();

const parseAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : []),
  ].filter(Boolean);

  return [...new Set(configuredOrigins)];
};

// ========== DYNAMIC CORS CONFIGURATION ==========
const corsOptions = {
  origin: function (origin, callback) {
    // Development: Allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Production: Only allow specific origins
    const allowedOrigins = parseAllowedOrigins();
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ========== BODY PARSING ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== USER ROUTES ==========
const userRoutes = require('./routes/User');
const productRoutes = require('./routes/Product');
const ManageUserRoutes = require('./routes/ManageUser');
const CartRoutes = require('./routes/Cart');
const checkoutRoutes = require('./routes/Checkout');
const orderRoutes = require('./routes/Order'); 
const manageOrderRoutes = require('./routes/ManageOrder'); 
const reviewRoutes = require('./routes/Review'); 
const manageReviewRoutes = require('./routes/ManageReview'); 
const salesAnalyticsRoutes = require('./routes/SalesAnalytics');
const assistantRoutes = require('./routes/Assistant');

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/', productRoutes);
app.use('/api/v1/', ManageUserRoutes);
app.use('/api/v1/cart', CartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/', manageOrderRoutes);
app.use('/api/v1/', reviewRoutes);
app.use('/api/v1/', manageReviewRoutes);
app.use('/api/v1/', salesAnalyticsRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// ========== HEALTH CHECK ==========
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    clientOrigin: req.headers.origin || 'No origin (likely mobile app)',
    clientIP: req.ip
  });
});

module.exports = app;
