const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional().default(""),
  price: z.coerce.number().nonnegative(),
  imagePath: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  subcategoryIds: z.array(z.string()).optional(),
  offerId: z.string().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
  details: z.record(z.string(), z.unknown()).optional()
});

module.exports = { createProductSchema };
