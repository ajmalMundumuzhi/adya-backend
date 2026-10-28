const Category = require("../../models/Category");

function findAll(filter = {}) {
  return Category.find(filter)
    .populate("parentId", "name slug")
    .sort({ createdAt: -1 });
}

function findById(id) {
  return Category.findById(id).populate("parentId", "name slug");
}

function findBySlug(slug) {
  return Category.findOne({ slug });
}

function create(data) {
  return Category.create(data);
}

function update(id, data) {
  return Category.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  }).populate("parentId", "name slug");
}

function deactivate(id) {
  return Category.findByIdAndDelete(id);
}

module.exports = { findAll, findById, findBySlug, create, update, deactivate };
