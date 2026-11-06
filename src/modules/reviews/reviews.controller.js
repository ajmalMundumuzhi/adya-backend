
const service = require("./reviews.service");

const {
  createReviewSchema,
  updateReviewSchema
} = require("./reviews.validation");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (
      error.name === "ZodError" ||
      error.name === "ValidationError" ||
      error.name === "CastError"
        ? 400
        : error.code === 11000
          ? 409
          : 500
    );

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}

async function list(req, res) {
  try {
    const reviews = await service.listReviews(
      false,
      req.query.productId
    );

    return res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function adminList(req, res) {
  try {
    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected"
    ];

    const status = req.query.status;

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status"
      });
    }

    const reviews = await service.listReviews(
      true,
      req.query.productId,
      status
    );

    return res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const review = await service.getReview(
      req.params.id,
      false
    );

    return res.json({
      success: true,
      data: review
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function adminGetById(req, res) {
  try {
    const review = await service.getReview(
      req.params.id,
      true
    );

    return res.json({
      success: true,
      data: review
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getMyReviews(req, res) {
  try {
    console.log("Customer ID:", req.user?.id);

    const reviews = await service.getCustomerReviews(
      req.user.id
    );

    return res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error("GET MY REVIEWS ERROR:", error);
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createReviewSchema.parse(req.body);

    const review = await service.createReview(
      data,
      req.user.id,
      req.files || []
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted for admin approval",
      data: review
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateReviewSchema.parse(req.body);

    const review = await service.updateReview(
      req.params.id,
      data
    );

    return res.json({
      success: true,
      message: "Review status updated successfully",
      data: review
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteReview(req.params.id);

    return res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  list,
  adminList,
  getById,
  adminGetById,
  getMyReviews,
  create,
  update,
  remove
};
