
const service = require("./products.service");
const { createProductSchema } = require("./products.validation");
const cloudinaryService = require("../../services/cloudinary.service");

function sendError(res, error) {
  console.error("PRODUCT API ERROR:", error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Product validation failed",
      errors: error.issues
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate product or SKU value"
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode
      ? error.message
      : "Internal server error"
  });
}

async function list(req, res) {
  try {
    const result = await service.list(req.query);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getById(req, res) {
  try {
    const product = await service.getById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      product
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await service.create(data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = createProductSchema.partial().parse(req.body);
    const product = await service.update(req.params.id, data);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deactivate(req, res) {
  try {
    const product = await service.deletePermanently(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      message: "Product permanently deleted successfully",
      deletedProductId: String(product._id)
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function uploadProductImage(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one image"
      });
    }

    const results = await Promise.all(
      req.files.map((file) =>
        cloudinaryService.uploadImage(file.buffer)
      )
    );

    return res.status(200).json({
      success: true,
      message: "Product images uploaded successfully",
      images: results.map((result) => ({
        imageUrl: result.secure_url,
        publicId: result.public_id
      }))
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  uploadProductImage
};
