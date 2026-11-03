
const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  eyebrow: {
    type: String,
    trim: true,
    default: ""
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true
  },
  mobileImageUrl: {
    type: String,
    trim: true,
    default: ""
  },
  altText: {
    type: String,
    trim: true,
    default: ""
  },
  ctaText: {
    type: String,
    trim: true,
    default: "Shop now"
  },
  ctaLink: {
    type: String,
    trim: true,
    default: "/shop"
  },
  imagePosition: {
    type: String,
    trim: true,
    default: "center 20%"
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

bannerSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("Banner", bannerSchema);
