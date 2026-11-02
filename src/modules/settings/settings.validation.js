const { z } = require("zod");

const settingSchema = z.object({
  key: z.string().trim().min(1).max(150),
  value: z.unknown()
});

const updateSettingSchema = z.object({
  value: z.unknown()
});

const inventoryThresholdSchema = z.number()
  .int("Threshold must be a whole number")
  .min(1, "Threshold must be at least 1")
  .max(100000, "Threshold is too high");

module.exports = {
  settingSchema,
  updateSettingSchema,
  inventoryThresholdSchema
};