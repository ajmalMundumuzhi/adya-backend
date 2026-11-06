const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  images: {
    type: [{
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      }
    }],
    default: []
  },
  imageUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
}, {
  timestamps: true
});

productReviewSchema.index(
  { productId: 1, customerId: 1 },
  { unique: true }
);

productReviewSchema.index({
  productId: 1,
  status: 1,
  createdAt: -1
});

productReviewSchema.index({
  customerId: 1,
  createdAt: -1
});

module.exports =
  mongoose.models.ProductReview ||
  mongoose.model("ProductReview", productReviewSchema);