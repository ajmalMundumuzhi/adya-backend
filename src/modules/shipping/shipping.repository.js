const ShippingRate = require("../../models/ShippingRate");

function findAll() {
  return ShippingRate.find().sort({ country: 1 });
}

function findById(id) {
  return ShippingRate.findById(id);
}

function findByCountry(country) {
  return ShippingRate.findOne({ country });
}

function create(data) {
  return ShippingRate.create(data);
}

function update(id, data) {
  return ShippingRate.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });
}

function remove(id) {
  return ShippingRate.findByIdAndDelete(id);
}

module.exports = { findAll, findById, findByCountry, create, update, remove };
