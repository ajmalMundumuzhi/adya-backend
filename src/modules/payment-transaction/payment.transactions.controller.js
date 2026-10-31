
const service = require("./payment.transactions.service");
const {
  transactionIdSchema,
  listTransactionsSchema
} = require("./payment.transactions.validation");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Internal server error"
        : error.message
  });
}

async function list(req, res) {
  try {
    const filters = listTransactionsSchema.parse(req.query);

    const result = await service.getTransactions(filters);

    return res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const id = transactionIdSchema.parse(req.params.id);

    const transaction = await service.getTransactionById(id);

    return res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  list,
  getById
};
