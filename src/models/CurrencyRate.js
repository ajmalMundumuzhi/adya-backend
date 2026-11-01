
const mongoose = require("mongoose");

const currencyRateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "AUD",
      unique: true,
      immutable: true
    },
    baseCurrency: {
      type: String,
      default: "AUD",
      required: true
    },
    rates: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rateDate: {
      type: String,
      default: null
    },
    fetchedAt: {
      type: Date,
      default: null
    },
    provider: {
      type: String,
      default: "Frankfurter"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.CurrencyRate ||
  mongoose.model("CurrencyRate", currencyRateSchema);
