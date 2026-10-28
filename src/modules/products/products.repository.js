const Product = require("../../models/Product");

function findAll(filter = {}, skip = 0, limit = 20) {
  return Product.find(filter)
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId", "name discountPercentage discountAmount")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
}

function count(filter = {}) {
  return Product.countDocuments(filter);
}

function findById(id) {
  return Product.findById(id)
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId", "name discountPercentage discountAmount");
}

function create(data) {
  return Product.create(data);
}

function update(id, data) {
  return Product.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  });
}

function deactivate(id) {
  return Product.findByIdAndDelete(id);
}

module.exports = { findAll, count, findById, create, update, deactivate };
