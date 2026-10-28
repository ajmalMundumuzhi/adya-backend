const User = require("../../models/User");

function findAll(filter = {}) {
  return User.find(filter).select("-password -passwordResetToken -passwordResetExpires").sort({ createdAt: -1 });
}

function findById(id) {
  return User.findById(id).select("-password -passwordResetToken -passwordResetExpires");
}

function findByEmail(email) {
  return User.findOne({ email });
}

function update(id, data) {
  return User.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  }).select("-password -passwordResetToken -passwordResetExpires");
}

module.exports = { findAll, findById, findByEmail, update };

