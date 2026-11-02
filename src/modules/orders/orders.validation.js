
const { z } = require("zod");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ID");

const supportedCurrencies = [
  "AUD",
  "NZD",
  "USD",
  "CAD",
  "GBP",
  "MYR",
  "SGD"
];

const createOrderSchema = z.object({
  addressId: objectId,
  currency: z.enum(supportedCurrencies),
  items: z.array(
    z.object({
      productId: objectId,
      variantId: objectId,
      sizeOptionId: objectId,
      quantity: z.coerce.number().int().min(1).max(100)
    })
  ).min(1).max(50)
});

const updateOrderSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
  ]).optional(),
  trackingProvider: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  trackingUrl: z.string().trim().url().optional().or(z.literal(""))
}).refine(
  data => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

module.exports = {
  createOrderSchema,
  updateOrderSchema
};
