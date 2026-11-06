const ProductReview = require("../../models/ProductReview");

function findAll(filter = {}) {
  return ProductReview.find(filter)
    .populate("productId", "name slug thumbnail")
    .populate("customerId", "name email")
    .populate("orderId", "orderNumber status")
    .sort({ createdAt: -1 });
}

function findById(id) {
  return ProductReview.findById(id)
    .populate("productId", "name slug thumbnail")
    .populate("customerId", "name email")
    .populate("orderId", "orderNumber status");
}

function findOne(filter) {
  return ProductReview.findOne(filter);
}

function create(data) {
  return ProductReview.create(data);
}

function update(id, data) {
  return ProductReview.findByIdAndUpdate(
    id,
    data,
    {
      returnDocument: "after",
      runValidators: true
    }
  );
}

function remove(id) {
  return ProductReview.findByIdAndDelete(id);
}

module.exports = {
  findAll,
  findById,
  findOne,
  create,
  update,
  remove
};