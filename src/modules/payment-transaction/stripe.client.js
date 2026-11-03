
const Stripe = require("stripe");

function getStripeClient() {
  const enabled = process.env.STRIPE_ENABLED === "true";
  const mode = (process.env.STRIPE_MODE || "test").trim().toLowerCase();
  const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();

  if (!enabled) {
    throw new Error("Stripe payments are disabled");
  }

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  if (!["test", "live"].includes(mode)) {
    throw new Error("STRIPE_MODE must be test or live");
  }

  if (mode === "test" && !secretKey.startsWith("sk_test_")) {
    throw new Error("A Stripe test Secret Key is required");
  }

  if (mode === "live" && !secretKey.startsWith("sk_live_")) {
    throw new Error("A Stripe live Secret Key is required");
  }

  return new Stripe(secretKey);
}

function getStripeWebhookSecret() {
  const webhookSecret = (
    process.env.STRIPE_WEBHOOK_SECRET || ""
  ).trim();

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is missing");
  }

  return webhookSecret;
}

module.exports = {
  getStripeClient,
  getStripeWebhookSecret
};
