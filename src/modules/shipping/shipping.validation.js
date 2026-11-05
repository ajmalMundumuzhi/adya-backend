
const { z } = require("zod");

const weightSlabSchema = z.object({
  label: z.string().trim().min(1).max(80),
  minWeightGrams: z.coerce.number().min(0),
  maxWeightGrams: z.coerce.number().positive(),
  rate: z.coerce.number().min(0)
}).refine(
  slab => slab.maxWeightGrams > slab.minWeightGrams,
  { message: "Maximum weight must be greater than minimum weight" }
);

const weightSlabsSchema = z.array(weightSlabSchema)
  .min(1, "At least one weight slab is required")
  .superRefine((slabs, ctx) => {
    const sorted = [...slabs].sort(
      (a, b) => a.minWeightGrams - b.minWeightGrams
    );

    sorted.forEach((slab, index) => {
      if (index > 0) {
        const previous = sorted[index - 1];

        if (slab.minWeightGrams < previous.maxWeightGrams) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Weight slabs cannot overlap",
            path: [index, "minWeightGrams"]
          });
        }
      }
    });
  });

const cityOverrideSchema = z.object({
  _id: z.string().optional(),
  city: z.string().trim().min(1).max(100),
  weightSlabs: weightSlabsSchema,
  isActive: z.boolean().default(true)
});

const createShippingRateSchema = z.object({
  country: z.string().trim().min(2).max(100),
  countryCode: z.string().trim().length(2).transform(value => value.toUpperCase()),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
  locale: z.string().trim().min(2).max(20),
  flag: z.string().trim().max(20).optional().default(""),
  weightSlabs: weightSlabsSchema,
  cityOverrides: z.array(cityOverrideSchema).default([]),
  isActive: z.boolean().default(true)
});

const updateShippingRateSchema = createShippingRateSchema.partial();

module.exports = {
  weightSlabSchema,
  weightSlabsSchema,
  cityOverrideSchema,
  createShippingRateSchema,
  updateShippingRateSchema
};
