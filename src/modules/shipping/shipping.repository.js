const ShippingRate = require("../../models/ShippingRate");

function findAll() {
  return ShippingRate.find().sort({ country: 1, city: 1 });
}

function findById(id) {
  return ShippingRate.findById(id);
}

function findByCountry(country) {
  return ShippingRate.find({
    country: new RegExp(`^${escapeRegex(country)}$`, "i")
  }).sort({ city: 1 });
}

function findByCountryAndCity(country, city) {
  return ShippingRate.findOne({
    country: new RegExp(`^${escapeRegex(country)}$`, "i"),
    city: new RegExp(`^${escapeRegex(city)}$`, "i")
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function create(data) {
  return ShippingRate.create(data);
}

function update(id, data) {
  return ShippingRate.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  });
}

function remove(id) {
  return ShippingRate.findByIdAndDelete(id);
}

module.exports = {
  findAll,
  findById,
  findByCountry,
  findByCountryAndCity,
  create,
  update,
  remove
};