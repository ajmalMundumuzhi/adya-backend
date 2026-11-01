
const { z } = require("zod");

const SUPPORTED_CURRENCIES = [
  "AUD",
  "NZD",
  "USD",
  "CAD",
  "GBP",
  "MYR",
  "SGD"
];

const checkoutPreviewSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  currency: z.enum(SUPPORTED_CURRENCIES).default("AUD")
}).strict();

const createCheckoutSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  currency: z.enum(SUPPORTED_CURRENCIES).default("AUD"),
  paymentMethod: z.enum(["stripe", "cod"])
}).strict();

module.exports = {
  checkoutPreviewSchema,
  createCheckoutSchema
};
