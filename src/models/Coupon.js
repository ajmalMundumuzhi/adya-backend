const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ["percent", "fixed"], required: true },
  discountAmount: { type: Number, required: true, min: 0 },
  visibility: { type: String, enum: ["public", "private"], default: "private" },
  expiryDate: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
