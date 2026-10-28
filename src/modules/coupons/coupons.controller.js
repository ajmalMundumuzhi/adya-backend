const service = require("./coupons.service");
const {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema
} = require("./coupons.validation");

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
    const data = await service.listCoupons(req.admin?.role === "admin");
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    return res.json({ success: true, data: await service.getCoupon(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createCouponSchema.parse(req.body);
    return res.status(201).json({
      success: true,
      data: await service.createCoupon(data)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateCouponSchema.parse(req.body);
    return res.json({
      success: true,
      data: await service.updateCoupon(req.params.id, data)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteCoupon(req.params.id);
    return res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
}

async function validate(req, res) {
  try {
    const data = validateCouponSchema.parse(req.body);
    return res.json({
      success: true,
      data: await service.validateCoupon(data.code, data.orderAmount)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getById, create, update, remove, validate };
