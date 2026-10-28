const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, select: false },
  name: { type: String, default: "Admin", trim: true },
  role: { type: String, enum: ["admin"], default: "admin" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("AdminUser", adminUserSchema);
