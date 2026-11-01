const { z } = require("zod");

const createShippingRateSchema = z.object({
  country: z.string().trim().min(1),
  city: z.string().trim().min(1),
  rate: z.coerce.number().nonnegative(),
  isActive: z.boolean().optional().default(true)
}).strict();

const updateShippingRateSchema = z.object({
  country: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  rate: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional()
}).strict().refine(
  data => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

module.exports = {
  createShippingRateSchema,
  updateShippingRateSchema
};