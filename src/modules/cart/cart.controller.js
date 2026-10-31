const service = require("./cart.service");

function handleError(res, error) {
  console.error("CART API ERROR:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong",
  });
}

async function getCart(req, res) {
  try {
    const cart = await service.getCart(req.user.id);

    return res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function addItem(req, res) {
  try {
    const cart = await service.addItem(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Item added to cart",
      data: cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateItem(req, res) {
  try {
    const cart = await service.updateItem(
      req.user.id,
      req.params.itemId,
      req.body.quantity
    );

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      data: cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function removeItem(req, res) {
  try {
    const cart = await service.removeItem(
      req.user.id,
      req.params.itemId
    );

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      data: cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function clearCart(req, res) {
  try {
    const cart = await service.clearCart(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: cart,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};