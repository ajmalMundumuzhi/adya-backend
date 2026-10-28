const { z } = require("zod");

const settingSchema = z.object({
  key: z.string().trim().min(1).max(150),
  value: z.unknown()
});

const updateSettingSchema = z.object({
  value: z.unknown()
});

module.exports = { settingSchema, updateSettingSchema };
