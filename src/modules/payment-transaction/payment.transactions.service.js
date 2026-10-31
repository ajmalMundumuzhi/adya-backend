
const mongoose = require("mongoose");
const repository = require("./payment.transactions.repository");

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function createTransaction(data) {
  if (!data.orderId || !validateObjectId(data.orderId)) {
    throw createError("Valid order ID is required");
  }

  if (data.customerId && !validateObjectId(data.customerId)) {
    throw createError("Invalid customer ID");
  }

  if (!["stripe", "cod"].includes(data.paymentMethod)) {
    throw createError("Invalid payment method");
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw createError("Transaction amount must be greater than zero");
  }

  if (!/^[A-Z]{3}$/.test(data.currency)) {
    throw createError("Invalid transaction currency");
  }

  return repository.createTransaction({
    ...data,
    status: data.paymentMethod === "cod" ? "pending" : "initiated"
  });
}

async function getTransactions(filters) {
  const filter = {};

  if (filters.orderId) filter.orderId = filters.orderId;
  if (filters.customerId) filter.customerId = filters.customerId;
  if (filters.paymentMethod) {
    filter.paymentMethod = filters.paymentMethod;
  }
  if (filters.status) filter.status = filters.status;

  const skip = (filters.page - 1) * filters.limit;

  const [transactions, total] = await Promise.all([
    repository.findTransactions(filter, skip, filters.limit),
    repository.countTransactions(filter)
  ]);

  return {
    transactions,
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

async function getTransactionById(id) {
  if (!validateObjectId(id)) {
    throw createError("Invalid transaction ID");
  }

  const transaction = await repository.findTransactionById(id);

  if (!transaction) {
    throw createError("Payment transaction not found", 404);
  }

  return transaction;
}

async function confirmStripePayment({
  sessionId,
  paymentIntentId
}) {
  if (!sessionId) {
    throw createError("Stripe Checkout Session ID is required");
  }

  const transaction = await repository.findByStripeSessionId(sessionId);

  if (!transaction) {
    throw createError("Payment transaction not found", 404);
  }

  if (transaction.paymentMethod !== "stripe") {
    throw createError("Transaction is not a Stripe payment");
  }

  if (transaction.status === "succeeded") {
    return transaction;
  }

  if (
    ["cancelled", "refunded", "partially_refunded"].includes(
      transaction.status
    )
  ) {
    throw createError("Transaction cannot be marked as successful");
  }

  if (paymentIntentId) {
    const existing = await repository.findByStripePaymentIntentId(
      paymentIntentId
    );

    if (existing && !existing._id.equals(transaction._id)) {
      throw createError("Payment Intent is already linked to another transaction", 409);
    }
  }

  return repository.updateTransaction(transaction._id, {
    status: "succeeded",
    stripePaymentIntentId: paymentIntentId || transaction.stripePaymentIntentId,
    paidAt: new Date(),
    failureCode: null,
    failureMessage: null
  });
}

async function recordStripeFailure({
  sessionId,
  failureCode,
  failureMessage
}) {
  if (!sessionId) {
    throw createError("Stripe Checkout Session ID is required");
  }

  const transaction = await repository.findByStripeSessionId(sessionId);

  if (!transaction) {
    throw createError("Payment transaction not found", 404);
  }

  if (transaction.status === "succeeded") {
    throw createError("A successful payment cannot be marked as failed");
  }

  return repository.updateTransaction(transaction._id, {
    status: "failed",
    failureCode: failureCode || null,
    failureMessage: failureMessage || null
  });
}

async function recordCodCollection(transactionId) {
  const transaction = await getTransactionById(transactionId);

  if (transaction.paymentMethod !== "cod") {
    throw createError("Transaction is not a COD payment");
  }

  if (transaction.status !== "pending") {
    throw createError("Only pending COD transactions can be collected");
  }

  return repository.updateTransaction(transaction._id, {
    status: "succeeded",
    paidAt: new Date()
  });
}

async function recordRefund({
  transactionId,
  refundId,
  amount
}) {
  const transaction = await getTransactionById(transactionId);

  if (transaction.paymentMethod !== "stripe") {
    throw createError("Only Stripe transactions can be refunded");
  }

  if (transaction.status !== "succeeded") {
    throw createError("Only successful transactions can be refunded");
  }

  if (!refundId || !Number.isFinite(amount) || amount <= 0) {
    throw createError("Valid refund ID and amount are required");
  }

  if (amount > transaction.amount) {
    throw createError("Refund amount cannot exceed transaction amount");
  }

  const status =
    amount === transaction.amount
      ? "refunded"
      : "partially_refunded";

  return repository.updateTransaction(transaction._id, {
    status,
    stripeRefundId: refundId,
    refundedAt: new Date(),
    metadata: {
      ...(transaction.metadata || {}),
      refundedAmount: amount
    }
  });
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  confirmStripePayment,
  recordStripeFailure,
  recordCodCollection,
  recordRefund
};
