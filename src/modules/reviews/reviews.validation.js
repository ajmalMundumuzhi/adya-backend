const { z } = require("zod");

const createReviewSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1),
  imageUrl: z.string().trim().optional().default("")
});

const updateReviewSchema = z.object({
  name: z.string().trim().min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  text: z.string().trim().min(1).optional(),
  imageUrl: z.string().trim().optional(),
  status: z.enum(["Pending", "Approved", "Rejected"]).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});

module.exports = { createReviewSchema, updateReviewSchema };
