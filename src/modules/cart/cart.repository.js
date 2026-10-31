const Cart = require("../../models/Cart");

function findByUser(userId) {
  return Cart.findOne({ userId })
    .populate("items.productId")
    .populate("items.variantId")
    .lean();
}

function findDocumentByUser(userId) {
  return Cart.findOne({ userId });
}

function create(data) {
  return Cart.create(data);
}

function save(cart) {
  return cart.save();
}

module.exports = {
  findByUser,
  findDocumentByUser,
  create,
  save,
};