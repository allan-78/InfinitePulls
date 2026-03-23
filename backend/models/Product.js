const mongoose = require('mongoose');

const CARD_CATEGORIES = [
  'Sports',
  'Pokemon',
  'Magic: The Gathering',
  'Yu-Gi-Oh!',
  'One Piece',
  'Dragon Ball',
  'Weiss Schwarz',
  'Other TCG',
];

const CARD_CONDITIONS = ['Mint', 'Near Mint', 'Good', 'Fair', 'Poor'];

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter card name'],
    trim: true,
    maxLength: [100, 'Card name cannot exceed 100 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please enter listing price'],
    maxLength: [7, 'Listing price cannot exceed 7 characters'],
    default: 0,
  },
  discountedPrice: {
    type: Number,
    default: null,
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  discountStartDate: {
    type: Date,
    default: null,
  },
  discountEndDate: {
    type: Date,
    default: null,
  },
  isOnSale: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    required: [true, 'Please enter card description'],
  },
  ratings: {
    type: Number,
    default: 0,
  },
  images: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  category: {
    type: String,
    required: [true, 'Please select a card category'],
    enum: {
      values: CARD_CATEGORIES,
      message: 'Please select a valid trading card category',
    },
  },
  condition: {
    type: String,
    required: [true, 'Please select the card condition'],
    enum: {
      values: CARD_CONDITIONS,
      message: 'Please select a valid card condition',
    },
  },
  seller: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  stock: {
    type: Number,
    required: [true, 'Please enter available quantity'],
    maxLength: [5, 'Stock cannot exceed 5 characters'],
    default: 1,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.virtual('effectivePrice').get(function () {
  if (this.isOnSale && this.discountedPrice && this.discountEndDate) {
    const now = new Date();
    if (now >= this.discountStartDate && now <= this.discountEndDate) {
      return this.discountedPrice;
    }
  }
  return this.price;
});

productSchema.methods.isDiscountActive = function () {
  if (!this.isOnSale || !this.discountStartDate || !this.discountEndDate) {
    return false;
  }
  const now = new Date();
  return now >= this.discountStartDate && now <= this.discountEndDate;
};

productSchema.pre('save', function (next) {
  if (this.discountStartDate && this.discountEndDate && this.discountedPrice) {
    const now = new Date();
    this.isOnSale = now >= this.discountStartDate && now <= this.discountEndDate;
  } else {
    this.isOnSale = false;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
