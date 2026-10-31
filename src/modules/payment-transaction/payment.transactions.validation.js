
const { z } = require("zod");

const transactionIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  "Invalid transaction ID"
);

const listTransactionsSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  paymentMethod: z.enum(["stripe", "cod"]).optional(),
  status: z.enum([
    "initiated",
    "pending",
    "succeeded",
    "failed",
    "cancelled",
    "refunded",
    "partially_refunded"
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

module.exports = {
  transactionIdSchema,
  listTransactionsSchema
};
