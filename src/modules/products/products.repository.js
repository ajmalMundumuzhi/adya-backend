const Product = require("../../models/Product");

const findAll = (filter, skip, limit) =>
  Product.find(filter)
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

const count = (filter) => Product.countDocuments(filter);

const findById = (id) =>
  Product.findOne({ _id: id, isActive: true })
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId");

const create = (data) => Product.create(data);

const update = (id, data) =>
  Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });

const deactivate = (id) =>
  Product.findByIdAndUpdate(id, { isActive: false }, { new: true });

module.exports = { findAll, count, findById, create, update, deactivate };
