const service = require("./addresses.service");

function handleError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

async function getAddresses(req, res) {
  try {
    const data = await service.getAddresses(req.user.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function addAddress(req, res) {
  try {
    const data = await service.addAddress(
      req.user.id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateAddress(req, res) {
  try {
    const data = await service.updateAddress(
      req.user.id,
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteAddress(req, res) {
  try {
    await service.deleteAddress(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function setDefaultAddress(req, res) {
  try {
    const data = await service.setDefaultAddress(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};