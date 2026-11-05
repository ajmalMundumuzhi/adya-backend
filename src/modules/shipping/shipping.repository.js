
const ShippingRate = require("../../models/ShippingRate");

async function findAll() {
  return ShippingRate.find().sort({ country: 1 });
}

async function findActiveCountries() {
  return ShippingRate.find({ isActive: true })
    .select("country countryCode currency locale flag isActive")
    .sort({ country: 1 })
    .lean();
}

async function findById(id) {
  return ShippingRate.findById(id);
}

async function findByCountryCode(countryCode) {
  return ShippingRate.findOne({
    countryCode: String(countryCode).toUpperCase()
  });
}

async function findByCountry(country) {
  return ShippingRate.findOne({
    country: new RegExp(`^${escapeRegex(country)}$`, "i"),
    isActive: true
  });
}

async function create(data) {
  return ShippingRate.create(data);
}

async function update(id, data) {
  return ShippingRate.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
}

async function remove(id) {
  return ShippingRate.findByIdAndDelete(id);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  findAll,
  findActiveCountries,
  findById,
  findByCountryCode,
  findByCountry,
  create,
  update,
  remove
};
