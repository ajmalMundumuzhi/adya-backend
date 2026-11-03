
const mongoose = require("mongoose");
const Order = require("../../models/Order");
const PaymentTransaction = require("../../models/PaymentTransaction");
const ProductVariant = require("../../models/ProductVariant");

const {
  getStripeClient,
  getStripeWebhookSecret
} = require("./stripe.client");

async function markPaymentSucceeded(stripeSession) {
  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      const transaction = await PaymentTransaction.findOne({
        stripeCheckoutSessionId: stripeSession.id,
        paymentMethod: "stripe",
        transactionType: "payment"
      }).session(mongoSession);

      if (!transaction) {
        throw new Error("Payment transaction not found");
      }

      if (
        stripeSession.metadata?.transactionId !== transaction._id.toString() ||
        stripeSession.metadata?.orderId !== transaction.orderId.toString()
      ) {
        throw new Error("Stripe session metadata does not match transaction");
      }

      if (stripeSession.payment_status !== "paid") {
        throw new Error("Stripe payment is not completed");
      }

      const expectedAmount = Math.round(Number(transaction.amount) * 100);

      if (Number(stripeSession.amount_total) !== expectedAmount) {
        throw new Error("Stripe payment amount does not match transaction");
      }

      if (
        String(stripeSession.currency).toUpperCase() !==
        String(transaction.currency).toUpperCase()
      ) {
        throw new Error("Stripe payment currency does not match transaction");
      }

      const order = await Order.findById(transaction.orderId).session(
        mongoSession
      );

      if (!order) {
        throw new Error("Order not found");
      }

      if (transaction.status === "succeeded") {
        return;
      }

      transaction.status = "succeeded";
      transaction.stripePaymentIntentId =
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : stripeSession.payment_intent?.id || null;
      transaction.paidAt = transaction.paidAt || new Date();
      transaction.failureCode = null;
      transaction.failureMessage = null;

      await transaction.save({ session: mongoSession });

      if (order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";

        if (order.status === "pending") {
          order.status = "confirmed";
        }

        await order.save({ session: mongoSession });
      }
    });
  } finally {
    await mongoSession.endSession();
  }
}

async function releaseReservedStock(order, mongoSession) {
  if (!order.stockReserved) {
    return;
  }

  for (const item of order.items) {
    const result = await ProductVariant.updateOne(
      {
        _id: item.variantId,
        productId: item.productId,
        "sizes._id": item.sizeOptionId
      },
      {
        $inc: {
          "sizes.$.stock": Number(item.quantity)
        }
      },
      {
        session: mongoSession
      }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Unable to restore stock for order item ${item._id || item.productId}`
      );
    }
  }

  order.stockReserved = false;
  order.stockReservationExpiresAt = null;
}

async function markPaymentFailed(stripeSession, reason) {
  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      const transaction = await PaymentTransaction.findOne({
        stripeCheckoutSessionId: stripeSession.id,
        paymentMethod: "stripe",
        transactionType: "payment"
      }).session(mongoSession);

      if (!transaction || transaction.status === "succeeded") {
        return;
      }

      if (
        stripeSession.metadata?.transactionId !== transaction._id.toString() ||
        stripeSession.metadata?.orderId !== transaction.orderId.toString()
      ) {
        throw new Error("Stripe session metadata does not match transaction");
      }

      const order = await Order.findById(transaction.orderId).session(
        mongoSession
      );

      if (!order || order.paymentStatus === "paid") {
        return;
      }

      const isCurrentTransaction =
        order.paymentTransactionId?.toString() === transaction._id.toString();

      transaction.status =
        reason === "Checkout session expired" ? "cancelled" : "failed";

      transaction.failureCode =
        reason === "Checkout session expired"
          ? "checkout_session_expired"
          : "payment_failed";

      transaction.failureMessage = reason;

      await transaction.save({ session: mongoSession });

      if (!isCurrentTransaction) {
        return;
      }

      await releaseReservedStock(order, mongoSession);

      order.paymentStatus = "failed";
      order.status = "cancelled";

      await order.save({ session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
}

async function handleWebhook(req, res) {
  let event;

  try {
    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Stripe signature"
      });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error.message);

    return res.status(400).json({
      success: false,
      message: "Invalid Stripe webhook signature"
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status === "paid") {
          await markPaymentSucceeded(session);
        }

        break;
      }

      case "checkout.session.async_payment_succeeded":
        await markPaymentSucceeded(event.data.object);
        break;

      case "checkout.session.async_payment_failed":
        await markPaymentFailed(
          event.data.object,
          "Asynchronous payment failed"
        );
        break;

      case "checkout.session.expired":
        await markPaymentFailed(
          event.data.object,
          "Checkout session expired"
        );
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return res.status(200).json({
      success: true,
      received: true
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed"
    });
  }
}

module.exports = {
  handleWebhook
};
