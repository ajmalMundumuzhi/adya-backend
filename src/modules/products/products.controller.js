const service = require("./products.service");
const { createProductSchema } = require("./products.validation");

function sendError(res, error) {
  if (error.name === "ValidationError" || error.name === "CastError" || error.name === "ZodError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate product value" });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
}

async function list(req, res) {
  try {
    res.json({ success: true, ...(await service.list(req.query)) });
  } catch (error) {
    sendError(res, error);
  }
}

async function getById(req, res) {
  try {
    const product = await service.getById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await service.create(data);
    res.status(201).json({ success: true, product });
  } catch (error) {
    sendError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = createProductSchema.partial().parse(req.body);
    const product = await service.update(req.params.id, data);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    sendError(res, error);
  }
}

async function deactivate(req, res) {
  try {
    const product = await service.deactivate(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deactivated", product });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { list, getById, create, update, deactivate };
