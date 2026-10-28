const express = require("express");
const cors = require("cors");
const productRoutes = require("./modules/products/products.routes");
const orderRoutes = require("./modules/orders/orders.routes");
const offerRoutes = require("./modules/offers/offers.routes");
const authRoutes = require("./modules/auth/auth.routes");
const categoryRoutes = require("./modules/categories/categories.routes");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ADYA API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/categories", categoryRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;


