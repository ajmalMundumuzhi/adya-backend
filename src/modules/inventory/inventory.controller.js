const service = require("./inventory.service");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ValidationError" || error.name === "CastError"
      ? 400
      : 500);

  return res.status(status).json({
    success: false,
    message:
      status === 500 ? "Internal server error" : error.message,
  });
}

async function adjustStock(req, res) {
  try {
    const result = await service.adjustStock({
      ...req.body,
      variantId: req.params.variantId,
      sizeOptionId: req.params.sizeOptionId,
      performedBy: req.user?.id || req.user?._id,
    });

    return res.json({
      success: true,
      message: "Inventory updated successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getHistory(req, res) {
  try {
    const result = await service.getHistory(req.query);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  adjustStock,
  getHistory,
};