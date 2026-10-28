const service = require("./settings.service");
const { settingSchema, updateSettingSchema } = require("./settings.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" || error.name === "ValidationError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    return res.json({ success: true, data: await service.listSettings() });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getByKey(req, res) {
  try {
    return res.json({ success: true, data: await service.getSetting(req.params.key) });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = settingSchema.parse(req.body);
    const setting = await service.createSetting(data);
    return res.status(201).json({ success: true, data: setting });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateSettingSchema.parse(req.body);
    const setting = await service.updateSetting(req.params.key, data.value);
    return res.json({ success: true, data: setting });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteSetting(req.params.key);
    return res.json({ success: true, message: "Setting deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getByKey, create, update, remove };
