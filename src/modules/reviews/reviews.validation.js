const { z } = require("zod");

const createReviewSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, {
    message: "Invalid product ID"
  }),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000)
});

const updateReviewSchema = z.object({
  status: z.enum(["Pending", "Approved", "Rejected"])
});

module.exports = {
  createReviewSchema,
  updateReviewSchema
};