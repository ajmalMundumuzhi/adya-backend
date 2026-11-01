
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

const currencyQuerySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES).default("AUD")
}).strict();

const conversionQuerySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  amount: z.coerce.number().finite().min(0)
}).strict();

module.exports = {
  SUPPORTED_CURRENCIES,
  currencyQuerySchema,
  conversionQuerySchema
};
