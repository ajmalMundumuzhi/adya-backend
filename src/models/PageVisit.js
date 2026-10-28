const mongoose = require("mongoose");

const pageVisitSchema = new mongoose.Schema({
  pageName: { type: String, required: true, trim: true },
  visitDate: { type: Date, required: true, default: Date.now },
  views: { type: Number, min: 1, default: 1 }
}, { timestamps: true });

pageVisitSchema.index({ pageName: 1, visitDate: 1 });

module.exports = mongoose.model("PageVisit", pageVisitSchema);
