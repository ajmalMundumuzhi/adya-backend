const service = require("./users.service");
const {
  updateProfileSchema,
  updateUserStatusSchema
} = require("./users.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" || error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    return res.json({ success: true, data: await service.listUsers() });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getMe(req, res) {
  try {
    return res.json({ success: true, data: await service.getUser(req.user.id) });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateMe(req, res) {
  try {
    const data = updateProfileSchema.parse(req.body);
    return res.json({
      success: true,
      data: await service.updateProfile(req.user.id, data)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    return res.json({ success: true, data: await service.getUser(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateStatus(req, res) {
  try {
    const data = updateUserStatusSchema.parse(req.body);
    return res.json({
      success: true,
      data: await service.updateStatus(req.params.id, data.isActive)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getMe, updateMe, getById, updateStatus };
