
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null
  },
  productName: { type: String, required: true },
  image: { type: String, default: null },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  items: { type: [orderItemSchema], default: [] },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true
  },
  customerName: { type: String, required: true, trim: true },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: { type: String, default: "" },
  shippingAddress: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    ],
    default: "pending"
  },
  totalAmount: { type: Number, required: true, min: 0 },
  trackingProvider: { type: String, default: null },
  trackingNumber: { type: String, default: null },
  trackingUrl: { type: String, default: null }
}, { timestamps: true });

orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);