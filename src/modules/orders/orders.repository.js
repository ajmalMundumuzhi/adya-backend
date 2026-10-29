
const Order = require("../../models/Order");

function findAll(filter = {}) {
  return Order.find(filter).sort({ createdAt: -1 });
}

function findById(id, options = {}) {
  return Order.findById(id).session(options.session || null);
}

function create(data, options = {}) {
  return Order.create(data, { session: options.session });
}

function update(id, data) {
  return Order.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  });
}

module.exports = { findAll, findById, create, update };
