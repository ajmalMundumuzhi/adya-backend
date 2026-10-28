const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  discountPercentage: { type: Number, min: 0, max: 100, default: null },
  discountAmount: { type: Number, min: 0, default: null },
  showOnIndex: { type: Boolean, default: false },
  promoCode: { type: String, unique: true, sparse: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);
