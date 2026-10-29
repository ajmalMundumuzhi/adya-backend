
const service = require("./orders.service");
const {
  createOrderSchema,
  updateOrderSchema
} = require("./orders.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" ||
    error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}

async function list(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.listOrders()
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listMine(req, res) {
  try {
    const orders = await service.listCustomerOrders(req.user.id);

    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.getOrder(req.params.id)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createOrderSchema.parse(req.body);

    if (req.user?.id) {
      data.customerId = req.user.id;
    }

    const order = await service.createOrder(data);

    return res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateOrderSchema.parse(req.body);
    const order = await service.updateOrder(req.params.id, data);

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  list,
  listMine,
  getById,
  create,
  update
};