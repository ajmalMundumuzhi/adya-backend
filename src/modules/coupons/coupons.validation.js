const { z } = require("zod");

const createCouponSchema = z.object({
  code: z.string().trim().min(1).transform(v => v.toUpperCase()),
  discountType: z.enum(["percent", "fixed"]),
  discountAmount: z.coerce.number().positive(),
  visibility: z.enum(["public", "private"]).optional().default("public"),
  expiryDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

const updateCouponSchema = z.object({
  code: z.string().trim().min(1).transform(v => v.toUpperCase()).optional(),
  discountType: z.enum(["percent", "fixed"]).optional(),
  discountAmount: z.coerce.number().positive().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});

const validateCouponSchema = z.object({
  code: z.string().trim().min(1).transform(v => v.toUpperCase()),
  orderAmount: z.coerce.number().nonnegative()
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema
};
