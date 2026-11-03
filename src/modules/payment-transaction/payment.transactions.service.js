
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../models/Order");
const repository = require("./payment.transactions.repository");
const { getStripeClient } = require("./stripe.client");
const ProductVariant = require("../../models/ProductVariant");

function makeError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function getFrontendUrl() {
  const url = process.env.CLIENT_URL;

  if (!url) {
    throw makeError("CLIENT_URL is not configured", 500);
  }

  return url.trim().replace(/\/+$/, "");
}

function validateOrder(order, customerId) {
  if (!order) {
    throw makeError("Order not found", 404);
  }

  if (order.customerId.toString() !== customerId.toString()) {
    throw makeError("You are not authorized to pay for this order", 403);
  }

  if (order.paymentStatus === "paid") {
    throw makeError("This order has already been paid", 409);
  }

  if (["cancelled", "delivered", "shipped"].includes(order.status)) {
    throw makeError("This order can no longer be paid", 400);
  }

  if (!order.stockReserved) {
    throw makeError("The stock reservation for this order has expired", 409);
  }

  if (
    !order.stockReservationExpiresAt ||
    new Date(order.stockReservationExpiresAt) <= new Date()
  ) {
    throw makeError("The stock reservation for this order has expired", 409);
  }

  if (!Number.isFinite(Number(order.totalAmount)) || Number(order.totalAmount) <= 0) {
    throw makeError("Invalid order amount");
  }

  if (!/^[A-Z]{3}$/.test(String(order.currency || ""))) {
    throw makeError("Invalid order currency");
  }
}

function toMinorUnits(amount) {
  const value = Math.round(Number(amount) * 100);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw makeError("Invalid payment amount");
  }

  return value;
}

async function getOrCreateTransaction(order) {
  let transaction = await repository.findByOrderId(order._id);

  if (transaction?.status === "succeeded") {
    throw makeError("This order has already been paid", 409);
  }

  const stripe = getStripeClient();

  if (transaction?.stripeCheckoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(
      transaction.stripeCheckoutSessionId
    );

    if (session.status === "open" && session.url) {
      return { transaction, session, reused: true };
    }

    if (session.status === "complete") {
      throw makeError(
        "Your payment is being verified. Please wait before retrying.",
        409
      );
    }

    if (session.status === "expired") {
      await repository.updateTransaction(transaction._id, {
        status: "cancelled",
        failureCode: "checkout_session_expired",
        failureMessage: "Stripe Checkout session expired"
      });

      transaction = null;
    }
  }

  if (transaction && transaction.status === "initiated") {
    return { transaction, session: null, reused: false };
  }

  transaction = await repository.createTransaction({
    orderId: order._id,
    customerId: order.customerId,
    paymentMethod: "stripe",
    transactionType: "payment",
    status: "initiated",
    amount: Number(order.totalAmount),
    currency: order.currency,
    idempotencyKey: crypto.randomUUID(),
    metadata: {
      orderNumber: order.orderNumber
    }
  });

  return { transaction, session: null, reused: false };
}

async function createCheckoutSession(orderId, customerId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeError("Invalid order ID");
  }

  const order = await Order.findById(orderId);

  validateOrder(order, customerId);

  const frontendUrl = getFrontendUrl();
  const amount = toMinorUnits(order.totalAmount);
  const stripe = getStripeClient();

  const existing = await getOrCreateTransaction(order);

  if (existing.session) {
    return {
      checkoutUrl: existing.session.url,
      sessionId: existing.session.id,
      orderId: order._id,
      reused: true
    };
  }

  const transaction = existing.transaction;

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // payment_method_types: ["card"],
        customer_email: order.customerEmail,
        line_items: [
          {
            price_data: {
              currency: order.currency.toLowerCase(),
              product_data: {
                name: `ADYA Order ${order.orderNumber || order._id}`,
                description: "ADYA saree order"
              },
              unit_amount: amount
            },
            quantity: 1
          }
        ],
        metadata: {
          orderId: order._id.toString(),
          transactionId: transaction._id.toString()
        },
        client_reference_id: order._id.toString(),
        expires_at: expiresAt,
        success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/payment/cancel?order_id=${order._id}`
      },
      {
        idempotencyKey: transaction.idempotencyKey
      }
    );

    await repository.updateTransaction(transaction._id, {
      stripeCheckoutSessionId: session.id,
      status: "initiated",
      failureCode: null,
      failureMessage: null
    });

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        customerId,
        paymentStatus: { $ne: "paid" },
        stockReserved: true
      },
      {
        $set: {
          paymentTransactionId: transaction._id,
          stockReservationExpiresAt: new Date(expiresAt * 1000)
        }
      },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedOrder) {
      await stripe.checkout.sessions.expire(session.id);
      throw makeError("Order is no longer available for payment", 409);
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order._id,
      reused: false
    };
  } catch (error) {
    await repository.updateTransaction(transaction._id, {
      status: "failed",
      failureCode: error.code || "checkout_session_creation_failed",
      failureMessage: "Unable to create Stripe Checkout session"
    });

    throw error;
  }
}

async function getCustomerPaymentStatus(sessionId, customerId) {
  if (!sessionId || typeof sessionId !== "string") {
    throw makeError("Invalid Stripe session ID");
  }

  const transaction = await repository.findByStripeSessionId(sessionId);

  if (
    !transaction ||
    transaction.customerId?.toString() !== customerId.toString()
  ) {
    throw makeError("Payment transaction not found", 404);
  }

  return {
    status: transaction.status,
    orderId: transaction.orderId,
    amount: transaction.amount,
    currency: transaction.currency,
    paidAt: transaction.paidAt
  };
}

async function listTransactions(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  const filter = {};

  if (query.orderId) filter.orderId = query.orderId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    repository.findTransactions(filter, (page - 1) * limit, limit),
    repository.countTransactions(filter)
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

async function getTransactionById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid transaction ID");
  }

  const transaction = await repository.findTransactionById(id);

  if (!transaction) {
    throw makeError("Payment transaction not found", 404);
  }

  return transaction;
}

async function cancelCheckoutSession(orderId, customerId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeError("Invalid order ID");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw makeError("Order not found", 404);
  }

  if (order.customerId.toString() !== customerId.toString()) {
    throw makeError("You are not authorized to cancel this order", 403);
  }

  if (order.paymentStatus === "paid") {
    throw makeError("This order has already been paid", 409);
  }

  if (!order.stockReserved) {
    return {
      message: "Stock reservation has already been released",
      released: false
    };
  }

  const transaction = await repository.findByOrderId(order._id);

  if (!transaction || !transaction.stripeCheckoutSessionId) {
    throw makeError("Checkout transaction not found", 404);
  }

  if (transaction.status === "succeeded") {
    throw makeError("This payment has already succeeded", 409);
  }

  const stripe = getStripeClient();

  let stripeSession = await stripe.checkout.sessions.retrieve(
    transaction.stripeCheckoutSessionId
  );

  if (stripeSession.payment_status === "paid") {
    throw makeError("Payment has already succeeded", 409);
  }

  if (stripeSession.status === "complete") {
    throw makeError(
      "Payment is being processed. Stock has not been released.",
      409
    );
  }

  if (stripeSession.status === "open") {
    try {
      stripeSession = await stripe.checkout.sessions.expire(
        stripeSession.id
      );
    } catch (error) {
      stripeSession = await stripe.checkout.sessions.retrieve(
        transaction.stripeCheckoutSessionId
      );

      if (
        stripeSession.status !== "expired" ||
        stripeSession.payment_status === "paid"
      ) {
        throw makeError(
          "Unable to safely cancel this payment session. Please check payment status.",
          409
        );
      }
    }
  }

  if (
    stripeSession.status !== "expired" ||
    stripeSession.payment_status === "paid"
  ) {
    throw makeError(
      "Payment session is not safely cancellable",
      409
    );
  }

  const dbSession = await mongoose.startSession();

  let released = false;

  try {
    await dbSession.withTransaction(async () => {
      const currentTransaction =
        await repository.findTransactionById(transaction._id);

      if (
        !currentTransaction ||
        currentTransaction.status === "succeeded"
      ) {
        throw makeError("Payment has already succeeded", 409);
      }

      const currentOrder = await Order.findOne({
        _id: order._id,
        customerId
      }).session(dbSession);

      if (!currentOrder) {
        throw makeError("Order not found", 404);
      }

      if (currentOrder.paymentStatus === "paid") {
        throw makeError("This order has already been paid", 409);
      }

      if (!currentOrder.stockReserved) {
        await repository.updateTransaction(
          transaction._id,
          {
            status: "cancelled",
            failureCode: "checkout_cancelled",
            failureMessage: "Customer cancelled Stripe Checkout"
          },
          { session: dbSession }
        );

        return;
      }

      if (
        currentOrder.paymentTransactionId?.toString() !==
        transaction._id.toString()
      ) {
        throw makeError(
          "This checkout session is no longer associated with the order",
          409
        );
      }

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: currentOrder._id,
          customerId,
          stockReserved: true,
          paymentStatus: { $ne: "paid" },
          paymentTransactionId: transaction._id
        },
        {
          $set: {
            stockReserved: false,
            stockReservationExpiresAt: null,
            paymentStatus: "failed",
            status: "cancelled"
          }
        },
        {
          session: dbSession,
          returnDocument: "after",
          runValidators: true
        }
      );

      if (!updatedOrder) {
        throw makeError(
          "Could not safely release the stock reservation",
          409
        );
      }

      for (const item of updatedOrder.items) {
        const result = await ProductVariant.updateOne(
          {
            _id: item.variantId,
            "sizes._id": item.sizeOptionId
          },
          {
            $inc: {
              "sizes.$.stock": item.quantity
            }
          },
          { session: dbSession }
        );

        if (result.matchedCount !== 1) {
          throw makeError(
            `Could not restore stock for product ${item.productName}`,
            500
          );
        }
      }

      await repository.updateTransaction(
        transaction._id,
        {
          status: "cancelled",
          failureCode: "checkout_cancelled",
          failureMessage: "Customer cancelled Stripe Checkout"
        },
        { session: dbSession }
      );

      released = true;
    });
  } finally {
    await dbSession.endSession();
  }

  return {
    message: released
      ? "Checkout cancelled and stock restored successfully"
      : "Stock reservation was already released",
    released
  };
}

module.exports = {
  createCheckoutSession,
  getCustomerPaymentStatus,
  listTransactions,
  getTransactionById,
  cancelCheckoutSession
};
