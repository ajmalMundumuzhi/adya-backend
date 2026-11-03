
const mongoose = require("mongoose");
const repository = require("./banner.repository");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listBanners(includeInactive = false) {
  return repository.findAll(
    includeInactive ? {} : { isActive: true }
  );
}

async function getBanner(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw createError("Invalid banner ID", 400);
  }

  const banner = await repository.findById(id);

  if (!banner) {
    throw createError("Banner not found", 404);
  }

  return banner;
}

async function createBanner(data) {
  return repository.create(data);
}

async function updateBanner(id, data) {
  await getBanner(id);

  const banner = await repository.update(id, data);

  if (!banner) {
    throw createError("Banner not found", 404);
  }

  return banner;
}

async function deactivateBanner(id) {
  await getBanner(id);

  const banner = await repository.deactivate(id);

  if (!banner) {
    throw createError("Banner not found", 404);
  }

  return banner;
}

module.exports = {
  listBanners,
  getBanner,
  createBanner,
  updateBanner,
  deactivateBanner
};
