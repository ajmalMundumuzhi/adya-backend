
const mongoose = require("mongoose");

const paymentSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true
    },
    stripe: {
      enabled: {
        type: Boolean,
        default: false
      },
      mode: {
        type: String,
        enum: ["test", "live"],
        default: "test"
      },
      secretKeyEncrypted: {
        type: String,
        default: ""
      },
      webhookSecretEncrypted: {
        type: String,
        default: ""
      }
    },
    cod: {
      enabled: {
        type: Boolean,
        default: true
      },
      minimumOrderAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      maximumOrderAmount: {
        type: Number,
        default: 100000,
        min: 0
      },
      additionalCharge: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    defaultCurrency: {
      type: String,
      default: "AUD",
      uppercase: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PaymentSetting", paymentSettingSchema);