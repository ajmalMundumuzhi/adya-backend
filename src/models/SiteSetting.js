const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
