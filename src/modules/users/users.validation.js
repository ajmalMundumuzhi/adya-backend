const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

module.exports = { updateProfileSchema, updateUserStatusSchema };
