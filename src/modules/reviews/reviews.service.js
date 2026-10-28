const mongoose = require("mongoose");
const repository = require("./reviews.repository");
const Product = require("../../models/Product");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listReviews(isAdmin = false, productId) {
  const filter = isAdmin ? {} : { status: "Approved" };

  if (productId) {
    if (!mongoose.isValidObjectId(productId)) {
      throw makeError("Invalid product ID", 400);
    }
    filter.productId = productId;
  }

  return repository.findAll(filter);
}

async function getReview(id, isAdmin = false) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid review ID", 400);
  }

  const review = await repository.findById(id);

  if (!review || (!isAdmin && review.status !== "Approved")) {
    throw makeError("Review not found", 404);
  }

  return review;
}

async function createReview(data) {
  if (!mongoose.isValidObjectId(data.productId)) {
    throw makeError("Invalid product ID", 400);
  }

  const product = await Product.findById(data.productId);

  if (!product || !product.isActive) {
    throw makeError("Product not found", 404);
  }

  return repository.create({ ...data, status: "Pending" });
}

async function updateReview(id, data) {
  await getReview(id, true);
  return repository.update(id, data);
}

async function deleteReview(id) {
  await getReview(id, true);
  await repository.remove(id);
}

module.exports = { listReviews, getReview, createReview, updateReview, deleteReview };
