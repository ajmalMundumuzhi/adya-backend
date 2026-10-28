require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const AdminUser = require("./models/AdminUser");
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ADYA API is running" });
});

app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Set JWT_SECRET to a random secret of at least 32 characters");
  }

  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (email && password) {
    const existingAdmin = await AdminUser.findOne({
      email: email.toLowerCase()
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(password, 12);

      await AdminUser.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: "ADYA Admin"
      });

      console.log("Initial admin account created");
    }
  }

  const port = Number(process.env.PORT) || 5000;

  app.listen(port, () => {
    console.log(`ADYA API running on port ${port}`);
  });
}

startServer().catch(error => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
