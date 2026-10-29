const service = require("./users.service");
const {
  registerSchema,
  loginSchema,
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

async function register(req, res) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await service.register(data);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function login(req, res) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await service.login(data.email, data.password);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
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

module.exports = {
  register,
  login,
  list,
  getMe,
  updateMe,
  getById,
  updateStatus
};
