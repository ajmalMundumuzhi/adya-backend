
const PaymentTransaction = require("../../models/PaymentTransaction");

async function createTransaction(data) {
  return PaymentTransaction.create(data);
}

async function findTransactions(filter, skip, limit) {
  return PaymentTransaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

async function countTransactions(filter) {
  return PaymentTransaction.countDocuments(filter);
}

async function findTransactionById(id) {
  return PaymentTransaction.findById(id);
}

async function findByStripeSessionId(sessionId) {
  return PaymentTransaction.findOne({
    stripeCheckoutSessionId: sessionId
  });
}

async function findByOrderId(orderId) {
  return PaymentTransaction.findOne({
    orderId,
    transactionType: "payment",
    status: {
      $in: ["initiated", "pending", "succeeded"]
    }
  }).sort({ createdAt: -1 });
}

async function updateTransaction(id, data, options = {}) {
  return PaymentTransaction.findByIdAndUpdate(
    id,
    { $set: data },
    {
      returnDocument: "after",
      runValidators: true,
      ...options
    }
  );
}

module.exports = {
  createTransaction,
  findTransactions,
  countTransactions,
  findTransactionById,
  findByStripeSessionId,
  findByOrderId,
  updateTransaction
};
