const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true
  },
  sizeOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ""
  },
  variantColor: {
    type: String,
    required: true
  },
  selectedSize: {
    type: String,
    required: true
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
  weightGrams: {
    type: Number,
    required: true,
    min: 1
  },
  totalWeightGrams: {
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
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: items => items.length > 0,
      message: "An order must contain at least one item"
    }
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
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
  totalWeightGrams: {
    type: Number,
    required: true,
    min: 1
  },
  shippingSlab: {
    type: mongoose.Schema.Types.Mixed,
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
    enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
    default: "pending"
  },
  paymentTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PaymentTransaction",
    default: null
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending"
  },
  stockReserved: {
    type: Boolean,
    default: false
  },
  stockReservationExpiresAt: {
    type: Date,
    default: null
  },
  trackingProvider: {
    type: String,
    default: ""
  },
  trackingNumber: {
    type: String,
    default: ""
  },
  trackingUrl: {
    type: String,
    default: ""
  }
}, { timestamps: true });

orderSchema.index({ customerEmail: 1 });
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ stockReserved: 1, stockReservationExpiresAt: 1 });

module.exports =
  mongoose.models.Order ||
  mongoose.model("Order", orderSchema);