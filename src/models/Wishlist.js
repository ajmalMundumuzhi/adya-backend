
const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true
  },
  sizeOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, { timestamps: true });

wishlistSchema.index(
  { userId: 1, productId: 1, variantId: 1, sizeOptionId: 1 },
  { unique: true }
);

module.exports = mongoose.models.Wishlist ||
  mongoose.model("Wishlist", wishlistSchema);
