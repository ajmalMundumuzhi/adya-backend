const service = require("./categories.service");
const {
  createCategorySchema,
  updateCategorySchema
} = require("./categories.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ValidationError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    const includeInactive =
      req.query.includeInactive === "true" &&
      req.admin?.role === "admin";

    const categories = await service.listCategories(includeInactive);

    return res.json({ success: true, data: categories });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const category = await service.getCategory(req.params.id);
    return res.json({ success: true, data: category });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await service.createCategory(data);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await service.updateCategory(req.params.id, data);

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deactivate(req, res) {
  try {
    const category = await service.deactivateCategory(req.params.id);

    return res.json({
      success: true,
      message: "Category deactivated successfully",
      data: category
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getById, create, update, deactivate };