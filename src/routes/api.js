const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Product = require("../models/Product");
const Category = require("../models/Category");
const Offer = require("../models/Offer");
const Order = require("../models/Order");
const AdminUser = require("../models/AdminUser");
const Coupon = require("../models/Coupon");
const ShippingRate = require("../models/ShippingRate");
const ProductReview = require("../models/ProductReview");
const SiteSetting = require("../models/SiteSetting");
const PageVisit = require("../models/PageVisit");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

function handleError(res, error) {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with this value already exists" });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}

router.post("/admin/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");

    const admin = await AdminUser.findOne({ email }).select("+password");

    if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id.toString(), role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name }
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/products", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const filter = { isActive: true };

    if (req.query.categoryId) filter.categoryId = req.query.categoryId;

    if (req.query.search) {
      filter.$text = { $search: String(req.query.search) };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("categoryId", "name slug")
        .populate("subcategoryIds", "name slug")
        .populate("offerId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({ products, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    })
      .populate("categoryId", "name slug")
      .populate("subcategoryIds", "name slug")
      .populate("offerId");

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deactivated", product });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/offers", async (req, res) => {
  try {
    res.json(await Offer.find().sort({ createdAt: -1 }));
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/offers", requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await Offer.create(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(500);
    res.json(orders);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/orders", async (req, res) => {
  try {
    const { items, customerName, customerEmail, phone, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one order item is required" });
    }

    if (!customerName || !customerEmail || !shippingAddress) {
      return res.status(400).json({
        message: "Customer name, email and shipping address are required"
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Invalid item quantity" });
      }

      const product = await Product.findOne({
        _id: item.productId,
        isActive: true
      });

      if (!product) {
        return res.status(400).json({ message: "A product in this order is unavailable" });
      }

      const unitPrice = product.price;
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        image: product.imagePath,
        quantity,
        unitPrice,
        subtotal
      });
    }

    const order = await Order.create({
      items: orderItems,
      customerName,
      customerEmail,
      phone: phone || "",
      shippingAddress,
      totalAmount
    });

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/orders/:id/tracking", requireAdmin, async (req, res) => {
  try {
    const { trackingProvider, trackingNumber, trackingUrl } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingProvider, trackingNumber, trackingUrl },
      { new: true, runValidators: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/coupons", requireAdmin, async (req, res) => {
  try {
    res.json(await Coupon.find().sort({ createdAt: -1 }));
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/coupons", requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await Coupon.create(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/shipping-rates", async (req, res) => {
  try {
    res.json(await ShippingRate.find().sort({ country: 1 }));
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/shipping-rates", requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await ShippingRate.create(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/products/:id/reviews", async (req, res) => {
  try {
    res.json(await ProductReview.find({
      productId: req.params.id,
      status: "Approved"
    }).sort({ createdAt: -1 }));
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/products/:id/reviews", async (req, res) => {
  try {
    const { name, rating, text, imageUrl } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const review = await ProductReview.create({
      productId: product._id,
      name,
      rating,
      text,
      imageUrl
    });

    res.status(201).json({ message: "Review submitted for moderation", review });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/admin/reviews", requireAdmin, async (req, res) => {
  try {
    res.json(await ProductReview.find().populate("productId", "name").sort({ createdAt: -1 }));
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/admin/reviews/:id", requireAdmin, async (req, res) => {
  try {
    if (!["Pending", "Approved", "Rejected"].includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    const review = await ProductReview.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!review) return res.status(404).json({ message: "Review not found" });

    res.json(review);
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/settings", async (req, res) => {
  try {
    const settings = await SiteSetting.find();
    res.json(Object.fromEntries(settings.map(item => [item.key, item.value])));
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/settings/:key", requireAdmin, async (req, res) => {
  try {
    const setting = await SiteSetting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(setting);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/page-visits", async (req, res) => {
  try {
    if (!req.body.pageName) {
      return res.status(400).json({ message: "pageName is required" });
    }

    const visit = await PageVisit.create({
      pageName: String(req.body.pageName).slice(0, 200),
      visitDate: new Date(),
      views: 1
    });

    res.status(201).json({ message: "Visit recorded", id: visit._id });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/admin/page-visits", requireAdmin, async (req, res) => {
  try {
    const visits = await PageVisit.aggregate([
      {
        $group: {
          _id: "$pageName",
          totalViews: { $sum: "$views" }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);

    res.json(visits);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
