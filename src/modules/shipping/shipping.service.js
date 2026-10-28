const mongoose = require("mongoose");
const repository = require("./shipping.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listRates() {
  return repository.findAll();
}

async function getRate(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid shipping rate ID", 400);
  }

  const rate = await repository.findById(id);
  if (!rate) throw makeError("Shipping rate not found", 404);
  return rate;
}

async function createRate(data) {
  const existing = await repository.findByCountry(data.country);

  if (existing) {
    throw makeError("A shipping rate already exists for this country", 409);
  }

  return repository.create(data);
}

async function updateRate(id, data) {
  await getRate(id);

  if (data.country) {
    const existing = await repository.findByCountry(data.country);

    if (existing && existing._id.toString() !== id) {
      throw makeError("A shipping rate already exists for this country", 409);
    }
  }

  return repository.update(id, data);
}

async function deleteRate(id) {
  await getRate(id);
  await repository.remove(id);
}

async function getRateByCountry(country) {
  const normalizedCountry = country.trim();
  const rate = await repository.findByCountry(normalizedCountry);

  if (!rate) {
    throw makeError("Shipping rate not configured for this country", 404);
  }

  return rate;
}

module.exports = {
  listRates,
  getRate,
  createRate,
  updateRate,
  deleteRate,
  getRateByCountry
};
