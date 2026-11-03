
const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cod"],
      required: true
    },
    transactionType: {
      type: String,
      enum: ["payment", "refund"],
      default: "payment"
    },
    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded"
      ],
      default: "initiated",
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    stripeCheckoutSessionId: {
      type: String,
      default: null
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    stripeRefundId: {
      type: String,
      default: null
    },
    idempotencyKey: {
      type: String,
      default: null
    },
    failureCode: {
      type: String,
      default: null
    },
    failureMessage: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    paidAt: {
      type: Date,
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentTransactionSchema.index(
  { stripeCheckoutSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripeCheckoutSessionId: { $type: "string" }
    }
  }
);

paymentTransactionSchema.index(
  { stripePaymentIntentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripePaymentIntentId: { $type: "string" }
    }
  }
);

paymentTransactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" }
    }
  }
);

module.exports =
  mongoose.models.PaymentTransaction ||
  mongoose.model("PaymentTransaction", paymentTransactionSchema);
