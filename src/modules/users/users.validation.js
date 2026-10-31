
const { z } = require("zod");

const phoneSchema = z.string().trim().max(20).optional().or(z.literal(""));

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  phone: phoneSchema,
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  password: z.string().min(1).max(72)
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
  phone: phoneSchema
}).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updateUserStatusSchema
};
