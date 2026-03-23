// backend/controllers/ManageOrderController.js
const Order = require("../models/Order");
const User = require("../models/User");
const { sendPushNotification } = require("../utils/pushNotification");

// 🟢 Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("orderItems.product", "name images category condition")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders." });
  }
};

// 🟢 Get a single order by ID (Admin)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name images category condition");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch order details." });
  }
};

// 🟢 Update order status (Admin) - FIXED: Proper push token handling and user info
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Processing",
      "Accepted",
      "Cancelled",
      "Out for Delivery",
      "Delivered",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed: Processing, Accepted, Cancelled, Out For Delivery, Delivered.",
      });
    }

    // FIXED: Use populate with explicit field selection including +pushToken
    const order = await Order.findById(id)
      .populate({
        path: "user",
        select: "name email +pushToken",
      })
      .populate("orderItems.product", "name");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // Log user data for debugging
    console.log("📱 Order update - User data:", {
      userId: order.user?._id,
      name: order.user?.name,
      email: order.user?.email,
      hasPushToken: !!order.user?.pushToken,
      pushTokenValue: order.user?.pushToken
        ? `${order.user.pushToken.substring(0, 20)}...`
        : "none",
    });

    const oldStatus = order.orderStatus;
    order.orderStatus = status;

    if (status === "Delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated. Buyer phone notification queued.",
      order,
    });

    if (!order.user || !order.user.pushToken) {
      console.log(
        `ℹ️ No push token found for user: ${order.user?.email || "unknown"}`,
      );
      return;
    }

    setImmediate(async () => {
      try {
        console.log(
          `📱 Attempting to send push notification for order #${order._id}`,
        );

        let notificationBody = `Your order #${order._id.toString().slice(-8)} status changed to ${status}`;

        const notificationData = {
          type: "ORDER_STATUS_UPDATE",
          orderId: order._id.toString(),
          orderNumber: order._id.toString().slice(-8),
          status,
          oldStatus,
          timestamp: new Date().toISOString(),
          user: {
            id: order.user._id.toString(),
            name: order.user.name,
            email: order.user.email,
          },
          orderSummary: {
            totalAmount: order.totalPrice,
            itemCount: order.orderItems.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
            items: order.orderItems.map((item) => ({
              productName: item.product?.name || "Product",
              quantity: item.quantity,
              price: item.price,
            })),
          },
        };

        if (status === "Delivered") {
          notificationBody = `🎉 Your order #${order._id.toString().slice(-8)} has been delivered.`;
        }

        await sendPushNotification(
          order.user.pushToken,
          `Order ${status}`,
          notificationBody,
          notificationData,
        );

        console.log(
          `✅ Push notification sent successfully for order #${order._id}`,
        );
      } catch (pushError) {
        console.error("❌ Failed to send push notification:", pushError);
        if (
          pushError.message &&
          pushError.message.includes("Invalid Expo push token") &&
          order.user?._id
        ) {
          await User.findByIdAndUpdate(order.user._id, { pushToken: null });
        }
      }
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update order." });
  }
};
// 🟢 Delete order (Admin)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    await order.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully." });
  } catch (error) {
    console.error("Error deleting order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete order." });
  }
};
