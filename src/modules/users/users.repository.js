const User = require("../../models/User");

function findAll(filter = {}) {
  return User.find(filter)
    .select("-password -passwordResetTokenHash -passwordResetExpires")
    .sort({ createdAt: -1 });
}

function findById(id) {
  return User.findById(id)
    .select("-password -passwordResetTokenHash -passwordResetExpires");
}

function findByEmail(email) {
  return User.findOne({ email }).select("+password");
}

function create(data) {
  return User.create(data);
}

function update(id, data) {
  return User.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  }).select("-password -passwordResetTokenHash -passwordResetExpires");
}

module.exports = { findAll, findById, findByEmail, create, update };
