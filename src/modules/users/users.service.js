const mongoose = require("mongoose");
const repository = require("./users.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listUsers() {
  return repository.findAll();
}

async function getUser(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid user ID", 400);
  }

  const user = await repository.findById(id);
  if (!user) throw makeError("User not found", 404);
  return user;
}

async function updateProfile(id, data) {
  const user = await getUser(id);

  if (data.email && data.email !== user.email) {
    const existing = await repository.findByEmail(data.email);
    if (existing) throw makeError("Email already registered", 409);
  }

  const updated = await repository.update(id, data);
  if (!updated) throw makeError("User not found", 404);
  return updated;
}

async function updateStatus(id, isActive) {
  await getUser(id);
  const updated = await repository.update(id, { isActive });
  if (!updated) throw makeError("User not found", 404);
  return updated;
}

module.exports = { listUsers, getUser, updateProfile, updateStatus };
