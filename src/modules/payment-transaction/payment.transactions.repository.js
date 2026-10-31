
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

async function findByStripePaymentIntentId(paymentIntentId) {
  return PaymentTransaction.findOne({
    stripePaymentIntentId: paymentIntentId
  });
}

async function updateTransaction(id, data) {
  return PaymentTransaction.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
}

module.exports = {
  createTransaction,
  findTransactions,
  countTransactions,
  findTransactionById,
  findByStripeSessionId,
  findByStripePaymentIntentId,
  updateTransaction
};
