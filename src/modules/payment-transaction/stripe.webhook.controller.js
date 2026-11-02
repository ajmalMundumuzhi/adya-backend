const { getStripeClient } = require("./stripe.client");
const Order = require("../../models/Order");
const PaymentTransaction = require("../../models/PaymentTransaction");

async function handleWebhook(req, res) {
  let stripe;
  let webhookSecret;

  try {
    const credentials = await getStripeClient();
    stripe = credentials.stripe;
    webhookSecret = credentials.webhookSecret;

    if (!webhookSecret) {
      return res.status(500).send("Webhook secret is not configured");
    }

    const signature = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );

    const session = event.data.object;

    if (event.type === "checkout.session.completed") {
      if (session.payment_status !== "paid") {
        return res.json({ received: true });
      }

      await markPaymentSucceeded(session);
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      await markPaymentSucceeded(session);
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      await markPaymentFailed(session, event.type);
    }

    return res.json({ received: true });
  } catch (error) {
    if (error.type === "StripeSignatureVerificationError") {
      return res.status(400).send("Invalid Stripe signature");
    }

    console.error("Stripe webhook error:", error);
    return res.status(500).send("Webhook processing failed");
  }
}

async function markPaymentSucceeded(session) {
  const transaction = await PaymentTransaction.findOne({
    stripeCheckoutSessionId: session.id,
    paymentMethod: "stripe"
  });

  if (!transaction) {
    throw new Error("Payment transaction not found for Stripe session");
  }

  if (transaction.status === "succeeded") return;

  if (transaction.status !== "initiated") {
    throw new Error("Transaction is not eligible for payment confirmation");
  }

  if (
    session.payment_status !== "paid" ||
    session.currency?.toUpperCase() !== transaction.currency ||
    session.amount_total !== Math.round(transaction.amount * 100)
  ) {
    throw new Error("Stripe payment details do not match the transaction");
  }

  const order = await Order.findById(transaction.orderId);

  if (!order) {
    throw new Error("Order not found for Stripe transaction");
  }

  if (order.paymentStatus === "paid") return;

  const dbSession = await Order.startSession();

  try {
    await dbSession.withTransaction(async () => {
      const currentTransaction = await PaymentTransaction.findById(
        transaction._id
      ).session(dbSession);

      const currentOrder = await Order.findById(
        order._id
      ).session(dbSession);

      if (!currentTransaction || !currentOrder) {
        throw new Error("Order or payment transaction not found");
      }

      if (currentTransaction.status === "succeeded") return;

      if (currentTransaction.status !== "initiated") {
        throw new Error("Transaction is not eligible for confirmation");
      }

      currentTransaction.status = "succeeded";
      currentTransaction.stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;
      currentTransaction.paidAt = new Date();

      currentOrder.paymentStatus = "paid";
      currentOrder.status = "confirmed";

      await currentTransaction.save({ session: dbSession });
      await currentOrder.save({ session: dbSession });
    });
  } finally {
    await dbSession.endSession();
  }
}

async function markPaymentFailed(session, reason) {
  const transaction = await PaymentTransaction.findOne({
    stripeCheckoutSessionId: session.id,
    paymentMethod: "stripe"
  });

  if (!transaction || transaction.status === "succeeded") return;

  const dbSession = await Order.startSession();

  try {
    await dbSession.withTransaction(async () => {
      const currentTransaction = await PaymentTransaction.findById(
        transaction._id
      ).session(dbSession);

      const order = await Order.findById(
        transaction.orderId
      ).session(dbSession);

      if (!currentTransaction || currentTransaction.status === "succeeded") {
        return;
      }

      currentTransaction.status = "failed";
      currentTransaction.failureCode = reason;
      currentTransaction.failureMessage =
        reason === "checkout.session.expired"
          ? "Stripe Checkout session expired"
          : "Stripe asynchronous payment failed";

      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "failed";
        order.status = "cancelled";
        await order.save({ session: dbSession });
      }

      await currentTransaction.save({ session: dbSession });
    });
  } finally {
    await dbSession.endSession();
  }
}

module.exports = { handleWebhook };