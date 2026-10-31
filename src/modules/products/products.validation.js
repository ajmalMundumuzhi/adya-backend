
const { z } = require("zod");

const sizeOptionSchema = z.object({
  size: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

const productVariantSchema = z.object({
  color: z.string().trim().min(1),
  images: z.array(z.string().url()).default([]),
  sizes: z.array(sizeOptionSchema).min(1),
  isActive: z.boolean().default(true),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().optional().default(""),
  categoryId: z.string().nullable().optional(),
  subcategoryIds: z.array(z.string()).optional().default([]),
  offerId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  details: z.record(z.string(), z.unknown()).optional().default({}),
  variants: z.array(productVariantSchema).min(1),
});

module.exports = {
  createProductSchema,
};