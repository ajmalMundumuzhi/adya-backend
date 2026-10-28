const mongoose = require("mongoose");
const repository = require("./offers.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listOffers(includeAll = false) {
  return repository.findAll(includeAll ? {} : { showOnIndex: true });
}

async function getOffer(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid offer ID", 400);
  }

  const offer = await repository.findById(id);
  if (!offer) throw makeError("Offer not found", 404);
  return offer;
}

async function createOffer(data) {
  if (data.promoCode) {
    const existing = await repository.findByPromoCode(data.promoCode);
    if (existing) throw makeError("Promo code already exists", 409);
  }

  return repository.create(data);
}

async function updateOffer(id, data) {
  await getOffer(id);

  if (data.promoCode) {
    const existing = await repository.findByPromoCode(data.promoCode);
    if (existing && existing._id.toString() !== id) {
      throw makeError("Promo code already exists", 409);
    }
  }

  return repository.update(id, data);
}

async function deleteOffer(id) {
  await getOffer(id);
  return repository.deactivate(id);
}

module.exports = { listOffers, getOffer, createOffer, updateOffer, deleteOffer };
