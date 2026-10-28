const mongoose = require("mongoose");
const repository = require("./settings.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listSettings() {
  return repository.findAll();
}

async function getSetting(key) {
  const setting = await repository.findByKey(key);
  if (!setting) throw makeError("Setting not found", 404);
  return setting;
}

async function createSetting(data) {
  const existing = await repository.findByKey(data.key);
  if (existing) throw makeError("Setting key already exists", 409);
  return repository.create(data);
}

async function updateSetting(key, value) {
  if (!key || key.length > 150) {
    throw makeError("Invalid setting key", 400);
  }

  return repository.updateByKey(key, value);
}

async function deleteSetting(key) {
  const setting = await repository.findByKey(key);
  if (!setting) throw makeError("Setting not found", 404);
  await repository.removeByKey(key);
}

module.exports = {
  listSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting
};
