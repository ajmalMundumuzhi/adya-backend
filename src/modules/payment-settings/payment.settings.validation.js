
const { z } = require("zod");

const updatePaymentSettingsSchema = z.object({
  stripe: z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(["test", "live"]).optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional()
  }).strict().optional(),

  cod: z.object({
    enabled: z.boolean().optional(),
    minimumOrderAmount: z.number().min(0).optional(),
    maximumOrderAmount: z.number().min(0).optional(),
    additionalCharge: z.number().min(0).optional()
  }).strict().optional(),

  defaultCurrency: z.string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one payment setting must be provided" }
);

module.exports = {
  updatePaymentSettingsSchema
};