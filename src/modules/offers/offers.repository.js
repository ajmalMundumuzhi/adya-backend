const Offer = require("../../models/Offer");

function findAll(filter = {}) {
  return Offer.find(filter).sort({ createdAt: -1 });
}

function findById(id) {
  return Offer.findById(id);
}

function findByPromoCode(promoCode) {
  return Offer.findOne({ promoCode });
}

function create(data) {
  return Offer.create(data);
}

function update(id, data) {
  return Offer.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  });
}

function deactivate(id) {
  return Offer.findByIdAndDelete(id);
}

module.exports = {
  findAll,
  findById,
  findByPromoCode,
  create,
  update,
  deactivate
};
