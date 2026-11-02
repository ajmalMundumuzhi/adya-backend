const Stripe = require("stripe");

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing from .env");
  }

  return {
    stripe: new Stripe(secretKey),
    webhookSecret: webhookSecret || null
  };
}

module.exports = { getStripeClient };