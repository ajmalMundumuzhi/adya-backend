const service = require("./analytics.service");
const { trackVisitSchema } = require("./analytics.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" || error.name === "ValidationError" ? 400 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function track(req, res) {
  try {
    const { pageName } = trackVisitSchema.parse(req.body);
    const visit = await service.trackPageVisit(pageName);

    return res.status(201).json({
      success: true,
      message: "Page visit recorded",
      data: visit
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function summary(req, res) {
  try {
    const data = await service.getAnalytics(req.query.from, req.query.to);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { track, summary };
