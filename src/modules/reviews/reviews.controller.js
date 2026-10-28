const service = require("./reviews.service");
const { createReviewSchema, updateReviewSchema } = require("./reviews.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" || error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    const isAdmin = req.admin?.role === "admin";
    const reviews = await service.listReviews(isAdmin, req.query.productId);
    return res.json({ success: true, data: reviews });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const review = await service.getReview(
      req.params.id,
      req.admin?.role === "admin"
    );
    return res.json({ success: true, data: review });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createReviewSchema.parse(req.body);
    const review = await service.createReview(data);
    return res.status(201).json({
      success: true,
      message: "Review submitted for approval",
      data: review
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateReviewSchema.parse(req.body);
    const review = await service.updateReview(req.params.id, data);
    return res.json({ success: true, data: review });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteReview(req.params.id);
    return res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getById, create, update, remove };
