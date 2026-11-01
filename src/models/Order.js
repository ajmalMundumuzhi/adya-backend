
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null
    },
    sizeOptionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      default: null
    },
    variantColor: {
      type: String,
      default: ""
    },
    selectedSize: {
      type: String,
      default: ""
    },
    sku: {
      type: String,
      default: ""
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPriceAUD: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: ""
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      default: null
    },
    shippingAddress: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    subtotalAUD: {
      type: Number,
      required: true,
      min: 0
    },
    shippingChargeAUD: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmountAUD: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRate: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRateDate: {
      type: String,
      required: true
    },
    exchangeRateFetchedAt: {
      type: Date,
      required: true
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shippingCharge: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ["AUD", "NZD", "USD", "CAD", "GBP", "MYR", "SGD"],
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cod"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded"
      ],
      default: "pending"
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null
    },
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
    trackingProvider: {
      type: String,
      default: null
    },
    trackingNumber: {
      type: String,
      default: null
    },
    trackingUrl: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
