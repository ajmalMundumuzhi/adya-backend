const { z } = require("zod");

const itemSchema = z.object({
  productId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid product ID"),
  quantity: z.coerce.number().int().positive().max(100)
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  customerEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  phone: z.string().trim().min(1).max(30),
  shippingAddress: z.string().trim().min(1).max(1000),
  items: z.array(itemSchema).min(1).max(50)
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
