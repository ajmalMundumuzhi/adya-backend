const mongoose = require("mongoose");

const productReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: "" },
  imageUrl: { type: String, default: null },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
}, { timestamps: true });

productReviewSchema.index({ productId: 1, status: 1 });

module.exports = mongoose.model("ProductReview", productReviewSchema);
