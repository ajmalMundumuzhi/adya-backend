
const service = require("./settings.service");
const {
  settingSchema,
  updateSettingSchema,
} = require("./settings.validation");
const {
  uploadSiteImage: uploadToCloudinary,
} = require("../../utils/uploadImage");

async function list(req, res, next) {
  try {
    const data = await service.listSettings();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getByKey(req, res, next) {
  try {
    const data = await service.getSetting(req.params.key);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const validation = settingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message,
      });
    }

    const data = await service.createSetting(validation.data);

    res.status(201).json({
      success: true,
      message: "Setting created successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const validation = updateSettingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message,
      });
    }

    const data = await service.updateSetting(
      req.params.key,
      validation.data.value
    );

    res.status(200).json({
      success: true,
      message: "Setting updated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteSetting(req.params.key);

    res.status(200).json({
      success: true,
      message: "Setting deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function uploadSiteImageController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    const { assetType } = req.body;

    if (!["logo", "favicon"].includes(assetType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid website asset type.",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      assetType
    );

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getByKey,
  create,
  update,
  remove,
  uploadSiteImage: uploadSiteImageController,
};
