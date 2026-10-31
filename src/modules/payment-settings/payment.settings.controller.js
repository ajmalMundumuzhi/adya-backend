
const service = require("./payment.settings.service");
const {
  updatePaymentSettingsSchema
} = require("./payment.settings.validation");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ValidationError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Internal server error"
        : error.message
  });
}

async function getAdminSettings(req, res) {
  try {
    const settings = await service.getPaymentSettings();

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPublicSettings(req, res) {
  try {
    const settings = await service.getPublicPaymentSettings();

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updatePaymentSettingsSchema.parse(req.body);

    const settings = await service.updatePaymentSettings(data);

    return res.json({
      success: true,
      message: "Payment settings updated successfully",
      data: settings
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getAdminSettings,
  getPublicSettings,
  update
};