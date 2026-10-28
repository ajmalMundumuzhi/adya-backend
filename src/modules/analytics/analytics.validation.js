const { z } = require("zod");

const trackVisitSchema = z.object({
  pageName: z.string().trim().min(1).max(200)
});

module.exports = { trackVisitSchema };
