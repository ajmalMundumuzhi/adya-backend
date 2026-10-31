
const mongoose = require("mongoose");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const repository = require("./wishlist.repository");

function makeError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError(`Invalid ${label}`, 400);
  }
}

async function getWishlist(userId) {
  return repository.findByUser(userId);
}

async function addToWishlist(userId, data) {
  const { productId, variantId, sizeOptionId } = data;

  validateId(productId, "product ID");
  validateId(variantId, "variant ID");
  validateId(sizeOptionId, "size option ID");

  const product = await Product.findOne({
    _id: productId,
    isActive: true
  }).lean();

  if (!product) {
    throw makeError("Product not found or unavailable", 404);
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    productId,
    isActive: true
  }).lean();

  if (!variant) {
    throw makeError("Product colour variant is unavailable", 404);
  }

  const size = variant.sizes.find(
    (item) =>
      item._id.toString() === sizeOptionId &&
      item.isActive !== false
  );

  if (!size) {
    throw makeError("Selected size is unavailable", 404);
  }

  return repository.add({
    userId,
    productId,
    variantId,
    sizeOptionId
  });
}

async function removeFromWishlist(userId, wishlistItemId) {
  validateId(wishlistItemId, "wishlist item ID");

  const result = await repository.remove({
    _id: wishlistItemId,
    userId
  });

  if (!result.deletedCount) {
    throw makeError("Wishlist item not found", 404);
  }

  return true;
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
