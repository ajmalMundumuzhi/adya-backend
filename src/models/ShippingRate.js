
const mongoose = require("mongoose");

const weightSlabSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    minWeightGrams: {
      type: Number,
      required: true,
      min: 0
    },
    maxWeightGrams: {
      type: Number,
      required: true,
      min: 1
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const cityOverrideSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true
    },
    weightSlabs: {
      type: [weightSlabSchema],
      required: true,
      validate: {
        validator: slabs => Array.isArray(slabs) && slabs.length > 0,
        message: "At least one city weight slab is required"
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const shippingRateSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      trim: true
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3
    },
    locale: {
      type: String,
      required: true,
      trim: true
    },
    flag: {
      type: String,
      trim: true,
      default: ""
    },
    weightSlabs: {
      type: [weightSlabSchema],
      required: true,
      validate: {
        validator: slabs => Array.isArray(slabs) && slabs.length > 0,
        message: "At least one default weight slab is required"
      }
    },
    cityOverrides: {
      type: [cityOverrideSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

shippingRateSchema.index({ countryCode: 1 }, { unique: true });
shippingRateSchema.index({ country: 1 });

module.exports =
  mongoose.models.ShippingRate ||
  mongoose.model("ShippingRate", shippingRateSchema);
