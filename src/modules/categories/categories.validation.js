const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  parentId: z.string().nullable().optional(),
  slug: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true)
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = {
  createCategorySchema,
  updateCategorySchema
};