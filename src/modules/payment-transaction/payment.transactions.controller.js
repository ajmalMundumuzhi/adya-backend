
const service = require("./payment.transactions.service");
const {
  listTransactionsSchema,
  transactionIdSchema
} = require("./payment.transactions.validation");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ZodError" ? 400 :
    error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  if (status === 500) {
    console.error("Payment transaction error:", error.stack || error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function createCheckoutSession(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    const data = await service.createCheckoutSession(
      orderId,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function cancelCheckoutSession(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    const data = await service.cancelCheckoutSession(
      orderId,
      req.user.id
    );

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getCustomerPaymentStatus(req, res) {
  try {
    const data = await service.getCustomerPaymentStatus(
      req.params.sessionId,
      req.user.id
    );

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function list(req, res) {
  try {
    const query = listTransactionsSchema.parse(req.query);
    const result = await service.listTransactions(query);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const id = transactionIdSchema.parse(req.params.id);
    const data = await service.getTransactionById(id);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createCheckoutSession,
  cancelCheckoutSession,
  getCustomerPaymentStatus,
  list,
  getById
};
