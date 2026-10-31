
const mongoose = require("mongoose");

const shippingRateSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

shippingRateSchema.index(
  { country: 1, city: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.ShippingRate ||
  mongoose.model("ShippingRate", shippingRateSchema);
