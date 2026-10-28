const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },
  slug: { type: String, unique: true, sparse: true, trim: true },
  imageUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ parentId: 1 });

module.exports = mongoose.model("Category", categorySchema);
