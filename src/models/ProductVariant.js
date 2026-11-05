const mongoose = require("mongoose");

const sizeOptionSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0,
    default: null
  },
  weightGrams: {
    type: Number,
    required: true,
    min: 1
  },
  stock: {
    type: Number,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const productVariantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String
  }],
  sizes: {
    type: [sizeOptionSchema],
    validate: {
      validator: sizes => sizes.length > 0,
      message: "At least one size option is required"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

productVariantSchema.index({ productId: 1, isActive: 1 });

module.exports =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", productVariantSchema);