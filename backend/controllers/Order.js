// backend/controllers/Order.js
const Order = require("../models/Order");

// Get all orders for the logged-in user
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId })
      .populate({
        path: 'orderItems.product',
        select: 'name images price'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;
    
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    }).populate({
      path: 'orderItems.product',
      select: 'name images price'
    });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};