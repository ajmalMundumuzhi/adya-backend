const { z } = require("zod");

const itemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().trim().min(1),
  image: z.string().optional().default(""),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative()
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1),
  customerEmail: z.string().email().optional().default(""),
  phone: z.string().trim().min(1),
  shippingAddress: z.string().trim().min(1),
  items: z.array(itemSchema).min(1),
  trackingProvider: z.string().optional().default(""),
  trackingNumber: z.string().optional().default(""),
  trackingUrl: z.string().url().optional().or(z.literal("")).default("")
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
  trackingProvider: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional().or(z.literal(""))
}).refine(data => Object.keys(data).length > 0, {
  message: "Provide at least one field to update"
});

module.exports = { createOrderSchema, updateOrderSchema };
