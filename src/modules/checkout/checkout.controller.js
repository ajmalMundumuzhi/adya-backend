
const service = require("./checkout.service");
const {
  checkoutPreviewSchema,
  createCheckoutSchema
} = require("./checkout.validation");
const stripeCheckoutService = require("./stripe.checkout.service");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ValidationError" ? 400 :
    error.name === "CastError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Internal server error"
        : error.message
  });
}

async function preview(req, res) {
  try {
    const data = checkoutPreviewSchema.parse(req.body);

    console.log("Logged-in customer ID:", req.user.id);
    console.log("Requested address ID:", data.addressId);

    const result = await service.previewCheckout(
      req.user.id,
      data
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createOrder(req, res) {
  try {
    const data = createCheckoutSchema.parse(req.body);

    const order = await service.createCodOrder(
      req.user.id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "COD order created successfully",
      data: order
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createStripeSession(req, res) {
  try {
    const data = checkoutPreviewSchema.parse(req.body);

    const result = await stripeCheckoutService.createStripeCheckout(
      req.user.id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Stripe Checkout Session created successfully",
      data: result
    });
  } catch (error) {
  console.error("STRIPE CHECKOUT ERROR:", error);
  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error"
  });
}
}

module.exports = {
  preview,
  createOrder,
  createStripeSession
};
