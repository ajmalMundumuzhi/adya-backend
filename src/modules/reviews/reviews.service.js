const mongoose = require("mongoose");
const repository = require("./reviews.repository");
const Product = require("../../models/Product");
const Order = require("../../models/Order");
const User = require("../../models/User");
const ProductVariant = require("../../models/ProductVariant");

const {
  uploadReviewImage,
  deleteReviewImage
} = require("../../services/cloudinary.service");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function recalculateProductRating(productId) {
  const result = await repository.findAll({
    productId,
    status: "Approved"
  });

  const count = result.length;

  const averageRating = count
    ? Number(
        (
          result.reduce((total, review) => total + review.rating, 0) /
          count
        ).toFixed(2)
      )
    : 0;

  await Product.findByIdAndUpdate(productId, {
    averageRating,
    reviewCount: count
  });
}

async function listReviews(isAdmin = false, productId, status) {
  const filter = {};

  if (!isAdmin) {
    filter.status = "Approved";
  } else if (status) {
    filter.status = status;
  }

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

async function createReview(data, customerId, files = []) {
  if (!mongoose.isValidObjectId(data.productId)) {
    throw makeError("Invalid product ID", 400);
  }

  const user = await User.findById(customerId)
    .select("_id name isActive");

  if (!user || !user.isActive) {
    throw makeError("Customer account is unavailable", 401);
  }

  const product = await Product.findById(data.productId);

  if (!product || !product.isActive) {
    throw makeError("Product not found", 404);
  }

  const existingReview = await repository.findOne({
    productId: product._id,
    customerId: user._id
  });

  if (existingReview) {
    throw makeError(
      "You have already reviewed this product",
      409
    );
  }

  const order = await Order.findOne({
    customerId: user._id,
    status: "delivered",
    "items.productId": product._id
  }).sort({ updatedAt: -1 });

  if (!order) {
    throw makeError(
      "You can review this product after receiving your order",
      403
    );
  }

  const uploadedImages = [];

  try {
    for (const file of files) {
      const uploaded = await uploadReviewImage(file.buffer);

      uploadedImages.push({
        url: uploaded.secure_url,
        publicId: uploaded.public_id
      });
    }

    const review = await repository.create({
      productId: product._id,
      customerId: user._id,
      orderId: order._id,
      name: user.name,
      rating: data.rating,
      text: data.text,
      images: uploadedImages,
      status: "Pending"
    });

    return review;
  } catch (error) {
    await Promise.allSettled(
      uploadedImages.map(image =>
        deleteReviewImage(image.publicId)
      )
    );

    if (error.code === 11000) {
      throw makeError(
        "You have already reviewed this product",
        409
      );
    }

    throw error;
  }
}

async function updateReview(id, data) {
  const existingReview = await repository.findById(id);

  if (!existingReview) {
    throw makeError("Review not found", 404);
  }

  const review = await repository.update(id, data);

  if (
    existingReview.status !== review.status &&
    (
      existingReview.status === "Approved" ||
      review.status === "Approved"
    )
  ) {
    await recalculateProductRating(existingReview.productId);
  }

  return review;
}

async function deleteReview(id) {
  const review = await repository.findById(id);

  if (!review) {
    throw makeError("Review not found", 404);
  }

  await repository.remove(id);

  if (review.status === "Approved") {
    await recalculateProductRating(review.productId);
  }

  if (review.images?.length) {
    await Promise.allSettled(
      review.images.map(image =>
        deleteReviewImage(image.publicId)
      )
    );
  }
}

async function getCustomerReviews(customerId) {
  const reviews = await repository.findAll({ customerId });

  const productIds = [
    ...new Set(
      reviews
        .map((review) => review.productId?._id?.toString())
        .filter(Boolean)
    ),
  ];

  const variants = await ProductVariant.find({
    productId: { $in: productIds },
    isActive: true,
  })
    .select("productId images")
    .sort({ createdAt: 1 })
    .lean();

  const productImages = new Map();

  for (const variant of variants) {
    const productId = variant.productId.toString();

    if (!productImages.has(productId) && variant.images?.length) {
      productImages.set(productId, variant.images[0]);
    }
  }

  return reviews.map((review) => {
    const reviewData = review.toObject();

    if (reviewData.productId) {
      const productId = reviewData.productId._id.toString();

      reviewData.productId.thumbnail =
        productImages.get(productId) || "";
    }

    return reviewData;
  });
}

module.exports = {
  listReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  getCustomerReviews
};