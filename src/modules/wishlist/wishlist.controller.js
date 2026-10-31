
const service = require("./wishlist.service");


function handleError(res, error) {
  console.error("WISHLIST API ERROR:", error);

  const status = error.statusCode ||
    (error.name === "ValidationError" || error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500
      ? "Internal server error"
      : error.message
  });
}


async function getWishlist(req, res) {
  try {
    const data = await service.getWishlist(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}

async function addToWishlist(req, res) {
  try {
    const data = await service.addToWishlist(req.user.id, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
}

async function removeFromWishlist(req, res) {
  try {
    await service.removeFromWishlist(req.user.id, req.params.id);
    return res.json({
      success: true,
      message: "Wishlist item removed"
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
