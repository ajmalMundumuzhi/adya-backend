const Order = require("../../models/Order");

function findAll(filter = {}) {
  return Order.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return Order.findById(id);
}

function create(data) {
  return Order.create(data);
}

function update(id, data) {
  return Order.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });
}

module.exports = { findAll, findById, create, update };
