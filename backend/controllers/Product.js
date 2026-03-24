const fs = require("fs");
const Product = require("../models/Product");
const Review = require("../models/Review");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/Cloudinary");
const { sendMultiplePushNotifications } = require("../utils/pushNotification");
const User = require("../models/User");

const getPreferredPushTargets = (user) => {
  const pushTokens = [
    ...(Array.isArray(user?.pushTokens)
      ? user.pushTokens.filter((entry) => entry?.token)
      : []),
    ...(!user?.pushToken ||
    (Array.isArray(user?.pushTokens) &&
      user.pushTokens.some((entry) => entry?.token === user.pushToken))
      ? []
      : [
          {
            token: user.pushToken,
            source: user.pushTokenSource || "unknown",
          },
        ]),
  ];

  const nativeTokens = pushTokens
    .filter((entry) => entry.source && entry.source !== "expo-go")
    .map((entry) => entry.token);

  if (nativeTokens.length) {
    return [...new Set(nativeTokens)];
  }

  const fallbackTokens = pushTokens.map((entry) => entry.token);

  if (fallbackTokens.length) {
    return [...new Set(fallbackTokens)];
  }

  return user?.pushToken ? [user.pushToken] : [];
};

const safeUnlink = (path) => {
  if (!path) return;
  fs.unlink(path, (err) => {
    if (err) {
      console.warn("Could not delete temp file", path, err.message);
    }
  });
};

const checkDiscountActive = (product) => {
  if (
    !product.discountedPrice ||
    !product.discountStartDate ||
    !product.discountEndDate
  ) {
    return false;
  }

  const now = new Date();
  const startDate = new Date(product.discountStartDate);
  const endDate = new Date(product.discountEndDate);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return now >= startDate && now <= endDate;
};

const isAdminUser = (user) => Boolean(user && user.role === "admin");

const parseExistingImages = (rawImages) => {
  if (!rawImages) return [];
  if (Array.isArray(rawImages)) return rawImages;

  try {
    return JSON.parse(rawImages);
  } catch (error) {
    return String(rawImages)
      .split(",")
      .filter(Boolean)
      .map((public_id) => ({ public_id }));
  }
};

const uploadIncomingImages = async (files = []) => {
  const uploaded = [];

  for (const file of files) {
    try {
      const uploadResult = await uploadToCloudinary(
        file.path,
        "infinitepulls/cards",
      );
      uploaded.push({
        public_id: uploadResult.public_id,
        url: uploadResult.url,
      });
    } finally {
      safeUnlink(file.path);
    }
  }

  return uploaded;
};

const hydrateProductsWithReviewData = async (products, forceOnSale = false) => {
  return Promise.all(
    products.map(async (product) => {
      const reviews = await Review.find({
        product: product._id,
        isActive: true,
      });

      const productObj = product.toObject();
      productObj.isOnSale = forceOnSale || checkDiscountActive(product);
      productObj.numOfReviews = reviews.length;
      productObj.ratings =
        reviews.length > 0
          ? reviews.reduce((acc, review) => acc + review.rating, 0) /
            reviews.length
          : 0;

      return productObj;
    }),
  );
};

const notifyDiscountDrop = async (product) => {
  if (!product.discountedPrice || !checkDiscountActive(product)) return;

  try {
    const discountPercent =
      product.discountPercentage ||
      Math.round(
        ((product.price - product.discountedPrice) / product.price) * 100,
      );

    const users = await User.find({
      isActive: true,
      $or: [
        { pushToken: { $exists: true, $ne: null } },
        { "pushTokens.0": { $exists: true } },
      ],
    }).select("+pushToken +pushTokenSource +pushTokens");

    const title = "New Card Deal Dropped";
    const body = `${product.name} is now ${discountPercent}% OFF for PHP ${product.discountedPrice}`;
    const data = {
      type: "PROMO_DISCOUNT",
      productId: product._id.toString(),
      productName: product.name,
      discountPercentage: discountPercent,
      discountedPrice: product.discountedPrice,
      originalPrice: product.price,
      screen: "SingleProduct",
      timestamp: new Date().toISOString(),
    };

    const messages = users
      .flatMap((user) => getPreferredPushTargets(user))
      .map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "order-updates",
      }));

    if (!messages.length) {
      return;
    }

    await sendMultiplePushNotifications(messages);
  } catch (error) {
    console.error("Discount notification error:", error.message);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const productImages = [];

    if (req.files?.length) {
      const uploadedImages = await uploadIncomingImages(req.files);
      productImages.push(...uploadedImages);
    } else if (Array.isArray(req.body.images) && req.body.images.length > 0) {
      productImages.push(...req.body.images);
    }

    const product = await Product.create({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      condition: req.body.condition,
      stock: req.body.stock,
      images: productImages,
      seller: req.user._id,
      discountedPrice: null,
      discountPercentage: null,
      discountStartDate: null,
      discountEndDate: null,
      isOnSale: false,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("seller", "name email avatar")
      .select("-reviews");

    const productsWithReviews = await hydrateProductsWithReviewData(products);

    res.status(200).json({
      success: true,
      count: productsWithReviews.length,
      products: productsWithReviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name email avatar",
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    const reviews = await Review.find({
      product: product._id,
      isActive: true,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const productObj = product.toObject();
    productObj.isOnSale = checkDiscountActive(product);
    productObj.reviews = reviews;
    productObj.numOfReviews = reviews.length;
    productObj.ratings =
      reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) /
          reviews.length
        : 0;

    res.status(200).json({ success: true, product: productObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    if (!isAdminUser(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only admins can update store packs",
        });
    }

    const existingImages = parseExistingImages(req.body.existingImages);
    const imagesToDelete = currentProduct.images.filter(
      (oldImg) =>
        !existingImages.some(
          (img) =>
            (img.public_id && img.public_id === oldImg.public_id) ||
            (img._id && img._id === oldImg._id) ||
            (img.url && img.url === oldImg.url),
        ),
    );

    const newUploadedImages = req.files?.length
      ? await uploadIncomingImages(req.files)
      : [];
    const mergedImages = [...existingImages, ...newUploadedImages];

    for (const img of imagesToDelete) {
      if (img.public_id && !img.public_id.startsWith("local_")) {
        try {
          await deleteFromCloudinary(img.public_id);
        } catch (error) {
          console.warn("Cloudinary delete warning:", error.message);
        }
      }
    }

    const updatePayload = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      condition: req.body.condition,
      stock: req.body.stock,
      images: mergedImages,
    };

    updatePayload.discountedPrice = req.body.discountedPrice
      ? Number(req.body.discountedPrice)
      : null;
    updatePayload.discountPercentage = req.body.discountPercentage
      ? Number(req.body.discountPercentage)
      : null;
    updatePayload.discountStartDate = req.body.discountStartDate || null;
    updatePayload.discountEndDate = req.body.discountEndDate || null;
    updatePayload.isOnSale = Boolean(
      updatePayload.discountedPrice &&
      updatePayload.discountStartDate &&
      updatePayload.discountEndDate &&
      checkDiscountActive(updatePayload),
    );

    const discountChanged = Boolean(
      updatePayload.discountedPrice &&
      (!currentProduct.discountedPrice ||
        Number(currentProduct.discountedPrice) !==
          Number(updatePayload.discountedPrice) ||
        Number(currentProduct.discountPercentage || 0) !==
          Number(updatePayload.discountPercentage || 0) ||
        String(currentProduct.discountStartDate || "") !==
          String(updatePayload.discountStartDate || "") ||
        String(currentProduct.discountEndDate || "") !==
          String(updatePayload.discountEndDate || "")),
    );

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      {
        new: true,
        runValidators: true,
      },
    ).populate("seller", "name email avatar");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    if (discountChanged && product.discountedPrice) {
      setImmediate(() => {
        notifyDiscountDrop(product).catch((error) => {
          console.error(
            "Background discount notification error:",
            error.message,
          );
        });
      });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDeletedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: false })
      .sort({ updatedAt: -1 })
      .populate("seller", "name email");

    const productsWithReviews = await Promise.all(
      products.map(async (product) => {
        const reviewCount = await Review.countDocuments({
          product: product._id,
          isActive: true,
        });
        const productObj = product.toObject();
        productObj.isOnSale = checkDiscountActive(product);
        productObj.numOfReviews = reviewCount;
        return productObj;
      }),
    );

    res.status(200).json({
      success: true,
      count: productsWithReviews.length,
      products: productsWithReviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    res.status(200).json({
      success: true,
      message: "Card listing restored successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.softDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    if (!isAdminUser(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only admins can archive store packs",
        });
    }

    product.isActive = false;
    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Card listing archived successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Card listing not found" });
    }

    if (!isAdminUser(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only admins can permanently delete store packs",
        });
    }

    if (product.images?.length) {
      for (const img of product.images) {
        if (img.public_id && !img.public_id.startsWith("local_")) {
          try {
            await deleteFromCloudinary(img.public_id);
          } catch (error) {
            console.warn("Cloudinary delete warning:", error.message);
          }
        }
      }
    }

    await Review.deleteMany({ product: req.params.id });
    await Product.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Card listing permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductsOnSale = async (req, res) => {
  try {
    const now = new Date();
    const products = await Product.find({
      isActive: true,
      discountedPrice: { $ne: null, $exists: true },
      discountStartDate: { $lte: now },
      discountEndDate: { $gte: now },
    })
      .populate("seller", "name email")
      .select("-reviews");

    const productsWithReviews = await hydrateProductsWithReviewData(
      products,
      true,
    );

    res.status(200).json({
      success: true,
      count: productsWithReviews.length,
      products: productsWithReviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDiscountNotifications = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const newDiscounts = await Product.find({
      isActive: true,
      discountedPrice: { $ne: null },
      discountStartDate: { $gte: sevenDaysAgo, $lte: now },
    })
      .populate("seller", "name")
      .select(
        "name price discountedPrice discountPercentage images category condition",
      );

    const endingSoonDiscounts = await Product.find({
      isActive: true,
      discountedPrice: { $ne: null },
      discountEndDate: { $gte: now, $lte: sevenDaysFromNow },
    })
      .populate("seller", "name")
      .select(
        "name price discountedPrice discountPercentage images category condition discountEndDate",
      );

    res.status(200).json({
      success: true,
      notifications: {
        newDiscounts,
        endingSoonDiscounts,
        total: newDiscounts.length + endingSoonDiscounts.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only admins can access store listings",
        });
    }

    const products = await Product.find({
      seller: req.user._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("seller", "name email avatar");

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
