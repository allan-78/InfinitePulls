// backend/controllers/CheckoutController.js
const Order = require("../models/Order");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Helper function to check if discount is active
const checkDiscountActive = (product) => {
  if (!product.discountedPrice || !product.discountStartDate || !product.discountEndDate) {
    return false;
  }
  
  const now = new Date();
  const startDate = new Date(product.discountStartDate);
  const endDate = new Date(product.discountEndDate);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return now >= startDate && now <= endDate;
};

// Get effective price (discounted if on sale)
const getEffectivePrice = (product) => {
  const isOnSale = checkDiscountActive(product);
  return isOnSale && product.discountedPrice ? product.discountedPrice : product.price;
};

// Cart checkout (multiple items)
exports.checkout = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user with address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch user's cart with populated products
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Check if user has complete address
    if (!user.address || !user.address.street || !user.address.barangay || !user.address.city || !user.address.zipcode) {
      return res.status(400).json({
        success: false,
        message: "Shipping address incomplete. Please update your profile with a valid address.",
      });
    }

    if (!user.contact) {
      return res.status(400).json({
        success: false,
        message: "Contact number is required. Please update your profile.",
      });
    }

    // Map user address to shippingInfo (matching your Order model)
    const shippingInfo = {
      address: `${user.address.street || ""}, ${user.address.barangay || ""}`.trim(),
      city: user.address.city || "",
      postalCode: user.address.zipcode || "",
      country: "Philippines",
      phoneNo: user.contact || "",
    };

    // Validate shipping info
    if (!shippingInfo.address || !shippingInfo.city || !shippingInfo.postalCode || !shippingInfo.phoneNo || !shippingInfo.country) {
      return res.status(400).json({
        success: false,
        message: "Shipping address incomplete. Please update your profile with a valid address and contact number.",
      });
    }

    // Check stock availability and calculate totals
    const TAX_RATE = 0.1;
    const SHIPPING_PRICE = 50;

    let itemsPrice = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;
      
      // Check if product exists and is active
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product?.name || 'Unknown'} is no longer available`,
        });
      }

      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const effectivePrice = getEffectivePrice(product);
      itemsPrice += effectivePrice * item.quantity;

      // Ensure image is a string (use empty string if no image)
      const imageUrl = product.images && product.images.length > 0 && product.images[0].url 
        ? product.images[0].url 
        : "";

      orderItems.push({
        name: product.name,
        quantity: item.quantity,
        price: effectivePrice,
        image: imageUrl, // Required field in your Order model
        product: product._id,
      });
    }

    const taxPrice = itemsPrice * TAX_RATE;
    const totalPrice = itemsPrice + taxPrice + SHIPPING_PRICE;

    // Create order
    const order = await Order.create({
      user: userId,
      orderItems,
      shippingInfo,
      itemsPrice,
      taxPrice,
      shippingPrice: SHIPPING_PRICE,
      totalPrice,
      orderStatus: "Processing",
      paidAt: Date.now(),
      createdAt: Date.now(),
    });

    // Decrease stock for each product
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock = Math.max(product.stock - item.quantity, 0);
        await product.save();
      }
    }

    // Clear user's cart
    cart.items = [];
    await cart.save();

    // Populate user info in order
    await order.populate('user', 'name email');

    res.status(201).json({ 
      success: true, 
      order,
      message: "Order placed successfully" 
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error during checkout" 
    });
  }
};

// Solo checkout (single product)
exports.soloCheckout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if user has complete address
    if (!user.address || !user.address.street || !user.address.barangay || !user.address.city || !user.address.zipcode) {
      return res.status(400).json({
        success: false,
        message: "Shipping address incomplete. Please update your profile with a valid address.",
      });
    }

    if (!user.contact) {
      return res.status(400).json({
        success: false,
        message: "Contact number is required. Please update your profile.",
      });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.isActive) {
      return res.status(400).json({ success: false, message: "Product is no longer available" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Not enough stock. Available: ${product.stock}` 
      });
    }

    // Map user address to shippingInfo
    const shippingInfo = {
      address: `${user.address.street || ""}, ${user.address.barangay || ""}`.trim(),
      city: user.address.city || "",
      postalCode: user.address.zipcode || "",
      country: "Philippines",
      phoneNo: user.contact || "",
    };

    // Calculate totals using effective price
    const effectivePrice = getEffectivePrice(product);
    const TAX_RATE = 0.1;
    const SHIPPING_PRICE = 50;

    const itemsPrice = effectivePrice * quantity;
    const taxPrice = itemsPrice * TAX_RATE;
    const totalPrice = itemsPrice + taxPrice + SHIPPING_PRICE;

    // Ensure image is a string (use empty string if no image)
    const imageUrl = product.images && product.images.length > 0 && product.images[0].url 
      ? product.images[0].url 
      : "";

    // Create order item
    const orderItems = [{
      name: product.name,
      quantity: quantity,
      price: effectivePrice,
      image: imageUrl, // Required field in your Order model
      product: product._id,
    }];

    // Create order
    const order = await Order.create({
      user: userId,
      orderItems,
      shippingInfo,
      itemsPrice,
      taxPrice,
      shippingPrice: SHIPPING_PRICE,
      totalPrice,
      orderStatus: "Processing",
      paidAt: Date.now(),
      createdAt: Date.now(),
    });

    // Decrease stock
    product.stock = Math.max(product.stock - quantity, 0);
    await product.save();

    // Populate user info in order
    await order.populate('user', 'name email');

    res.status(201).json({ 
      success: true, 
      order,
      message: "Order placed successfully" 
    });
  } catch (error) {
    console.error("Solo checkout error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Server error during checkout" 
    });
  }
};