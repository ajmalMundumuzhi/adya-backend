const mongoose = require("mongoose");

const shippingRateSchema = new mongoose.Schema({
  country: { type: String, required: true, unique: true, trim: true },
  rate: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("ShippingRate", shippingRateSchema);
