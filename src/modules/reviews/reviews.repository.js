const ProductReview = require("../../models/ProductReview");

function findAll(filter = {}) {
  return ProductReview.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return ProductReview.findById(id);
}

function create(data) {
  return ProductReview.create(data);
}

function update(id, data) {
  return ProductReview.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });
}

function remove(id) {
  return ProductReview.findByIdAndDelete(id);
}

module.exports = { findAll, findById, create, update, remove };
