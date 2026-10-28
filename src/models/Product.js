const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0, default: null },
  imagePath: { type: String, default: null },
  images: [{ type: String }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },
  subcategoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  }],
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
    default: null
  },
  stock: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
