const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email().transform(value => value.toLowerCase().trim()),
  password: z.string().min(1)
});

module.exports = { loginSchema };
