const { z } = require("zod");

const createOfferSchema = z.object({
  name: z.string().trim().min(1),
  discountPercentage: z.coerce.number().min(0).max(100).optional().default(0),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  showOnIndex: z.boolean().optional().default(false),
  promoCode: z.string().trim().transform(v => v.toUpperCase()).optional().nullable()
}).refine(
  data => data.discountPercentage > 0 || data.discountAmount > 0,
  { message: "Provide a percentage or fixed discount" }
);

const updateOfferSchema = z.object({
  name: z.string().trim().min(1).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  showOnIndex: z.boolean().optional(),
  promoCode: z.string().trim().transform(v => v.toUpperCase()).nullable().optional()
});

module.exports = { createOfferSchema, updateOfferSchema };
