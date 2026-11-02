const express = require("express");
const cors = require("cors");
const productRoutes = require("./modules/products/products.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const userRoutes = require("./modules/users/users.routes");
const settingRoutes = require("./modules/settings/settings.routes");
const shippingRoutes = require("./modules/shipping/shipping.routes");
const couponRoutes = require("./modules/coupons/coupons.routes");
const reviewRoutes = require("./modules/reviews/reviews.routes");
const orderRoutes = require("./modules/orders/orders.routes");
const offerRoutes = require("./modules/offers/offers.routes");
const authRoutes = require("./modules/auth/auth.routes");
const categoryRoutes = require("./modules/categories/categories.routes");
const wishlistRoutes = require("./modules/wishlist/wishlist.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const addressRoutes = require("./modules/addresses/addresses.routes");
const paymentSettingsRoutes = require("./modules/payment-settings/payment.settings.routes");
const paymentTransactionRoutes = require("./modules/payment-transaction/payment.transaction.routes");
const currencyRoutes = require("./modules/currency/currency.routes");
const checkoutRoutes = require("./modules/checkout/checkout.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const stripeWebhookRoutes = require("./modules/payment-transaction/stripe.webhook.routes");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(
  "/api/payment-transactions/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ADYA API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/payment-settings", paymentSettingsRoutes);
app.use("/api/payment-transactions", paymentTransactionRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/inventory", inventoryRoutes);


app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;