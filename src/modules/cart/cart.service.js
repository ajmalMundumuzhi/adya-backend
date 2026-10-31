const mongoose = require("mongoose");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const repository = require("./cart.repository");

function makeError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError(`Invalid ${label}`, 400);
  }
}

function findSize(variant, sizeOptionId) {
  return variant.sizes.find(
    (size) =>
      size._id.toString() === sizeOptionId &&
      size.isActive !== false
  );
}

async function getOrCreateCart(userId) {
  let cart = await repository.findDocumentByUser(userId);

  if (!cart) {
    cart = await repository.create({
      userId,
      items: [],
    });
  }

  return cart;
}

async function getCart(userId) {
  return (
    (await repository.findByUser(userId)) || {
      userId,
      items: [],
    }
  );
}

async function addItem(userId, data) {
  const { productId, variantId, sizeOptionId } = data;
  const quantity = Number(data.quantity ?? 1);

  validateId(productId, "product ID");
  validateId(variantId, "variant ID");
  validateId(sizeOptionId, "size option ID");

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw makeError("Quantity must be a positive integer", 400);
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  }).lean();

  if (!product) {
    throw makeError("Product not found or unavailable", 404);
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    productId,
    isActive: true,
  }).lean();

  if (!variant) {
    throw makeError("Product colour variant is unavailable", 404);
  }

  const size = findSize(variant, sizeOptionId);

  if (!size) {
    throw makeError("Selected size is unavailable", 404);
  }

  if (size.stock < 1) {
    throw makeError("This size is out of stock", 400);
  }

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) =>
      item.productId.toString() === productId &&
      item.variantId.toString() === variantId &&
      item.sizeOptionId.toString() === sizeOptionId
  );

  const nextQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (nextQuantity > size.stock) {
    throw makeError(`Only ${size.stock} items are available`, 400);
  }

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    cart.items.push({
      productId,
      variantId,
      sizeOptionId,
      quantity,
    });
  }

  await repository.save(cart);

  return repository.findByUser(userId);
}

async function updateItem(userId, itemId, quantity) {
  validateId(itemId, "cart item ID");

  const nextQuantity = Number(quantity);

  if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
    throw makeError("Quantity must be a positive integer", 400);
  }

  const cart = await repository.findDocumentByUser(userId);

  if (!cart) {
    throw makeError("Cart not found", 404);
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw makeError("Cart item not found", 404);
  }

  const variant = await ProductVariant.findOne({
    _id: item.variantId,
    productId: item.productId,
    isActive: true,
  }).lean();

  if (!variant) {
    throw makeError("Product variant is unavailable", 400);
  }

  const size = findSize(variant, item.sizeOptionId.toString());

  if (!size || size.stock < nextQuantity) {
    throw makeError(
      size ? `Only ${size.stock} items are available` : "Selected size is unavailable",
      400
    );
  }

  item.quantity = nextQuantity;

  await repository.save(cart);

  return repository.findByUser(userId);
}

async function removeItem(userId, itemId) {
  validateId(itemId, "cart item ID");

  const cart = await repository.findDocumentByUser(userId);

  if (!cart) {
    throw makeError("Cart not found", 404);
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw makeError("Cart item not found", 404);
  }

  item.deleteOne();

  await repository.save(cart);

  return repository.findByUser(userId);
}

async function clearCart(userId) {
  const cart = await repository.findDocumentByUser(userId);

  if (!cart) {
    return { userId, items: [] };
  }

  cart.items = [];

  await repository.save(cart);

  return { userId, items: [] };
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};