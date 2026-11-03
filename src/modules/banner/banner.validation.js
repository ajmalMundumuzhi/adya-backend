
const { z } = require("zod");

const bannerSchema = z.object({
  eyebrow: z.string().trim().max(100).optional().default(""),
  title: z.string().trim().min(1, "Banner title is required").max(150),
  description: z.string().trim().max(500).optional().default(""),
  imageUrl: z.string().trim().min(1, "Desktop banner image is required"),
  mobileImageUrl: z.string().trim().optional().default(""),
  altText: z.string().trim().max(200).optional().default(""),
  ctaText: z.string().trim().max(60).optional().default("Shop now"),
  ctaLink: z.string().trim().max(500).optional().default("/shop"),
  imagePosition: z.string().trim().max(100).optional().default("center 20%"),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true)
});

const createBannerSchema = bannerSchema;

const updateBannerSchema = bannerSchema.partial();

module.exports = {
  createBannerSchema,
  updateBannerSchema
};
