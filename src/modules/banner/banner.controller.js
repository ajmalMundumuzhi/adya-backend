
const service = require("./banner.service");
const {
  createBannerSchema,
  updateBannerSchema
} = require("./banner.validation");
const cloudinaryService = require("../../services/cloudinary.service");

function handleError(res, error) {
  const status = error.statusCode ||
    (
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.name === "ZodError"
        ? 400
        : 500
    );

  if (status === 500) {
    console.error("BANNERS API ERROR:", error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}

async function list(req, res) {
  try {
    const includeInactive =
      req.query.includeInactive === "true" &&
      req.admin?.role === "admin";

    const banners = await service.listBanners(includeInactive);

    return res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const banner = await service.getBanner(req.params.id);

    return res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createBannerSchema.parse(req.body);
    const banner = await service.createBanner(data);

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateBannerSchema.parse(req.body);
    const banner = await service.updateBanner(req.params.id, data);

    return res.json({
      success: true,
      message: "Banner updated successfully",
      data: banner
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deactivate(req, res) {
  try {
    const banner = await service.deactivateBanner(req.params.id);

    return res.json({
      success: true,
      message: "Banner deactivated successfully",
      data: banner
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function uploadBannerImages(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one image"
      });
    }

    const results = await Promise.all(
      req.files.map((file) =>
        cloudinaryService.uploadImage(
          file.buffer,
          "adya/banners"
        )
      )
    );

    return res.json({
      success: true,
      message: "Banner images uploaded successfully",
      images: results.map((result) => ({
        imageUrl: result.secure_url,
        publicId: result.public_id
      }))
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  uploadBannerImages
};
