const AdminUser = require("../../models/AdminUser");

function findByEmail(email) {
  return AdminUser.findOne({ email }).select("+password");
}

module.exports = { findByEmail };
