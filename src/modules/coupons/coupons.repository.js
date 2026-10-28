const Coupon = require("../../models/Coupon");

function findAll(filter = {}) {
  return Coupon.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return Coupon.findById(id);
}

function findByCode(code) {
  return Coupon.findOne({ code });
}

function create(data) {
  return Coupon.create(data);
}

function update(id, data) {
  return Coupon.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });
}

function remove(id) {
  return Coupon.findByIdAndDelete(id);
}

module.exports = { findAll, findById, findByCode, create, update, remove };
