const mongoose = require("mongoose");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const InventoryLog = require("../../models/InventoryLogs");

async function adjustStock({
  variantId,
  sizeOptionId,
  action,
  quantity,
  reason,
  performedBy,
}) {
  if (
    !mongoose.isValidObjectId(variantId) ||
    !mongoose.isValidObjectId(sizeOptionId)
  ) {
    const error = new Error("Invalid variant or size ID");
    error.statusCode = 400;
    throw error;
  }

  if (!["increase", "decrease", "set"].includes(action)) {
    const error = new Error("Invalid stock adjustment action");
    error.statusCode = 400;
    throw error;
  }

  const amount = Number(quantity);

  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error("Quantity must be a valid non-negative number");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(amount)) {
    const error = new Error("Stock quantity must be a whole number");
    error.statusCode = 400;
    throw error;
  }

  if (action !== "set" && amount <= 0) {
    const error = new Error("Increase and decrease quantities must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  if (!String(reason || "").trim()) {
    const error = new Error("Adjustment reason is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const variant = await ProductVariant.findOne({
        _id: variantId,
        isActive: true,
      }).session(session);

      if (!variant) {
        const error = new Error("Product variant not found");
        error.statusCode = 404;
        throw error;
      }

      const sizeOption = variant.sizes.id(sizeOptionId);

      if (!sizeOption) {
        const error = new Error("Product size option not found");
        error.statusCode = 404;
        throw error;
      }

      const previousStock = Number(sizeOption.stock || 0);

      let newStock;

      if (action === "increase") {
        newStock = previousStock + amount;
      } else if (action === "decrease") {
        newStock = previousStock - amount;
      } else {
        newStock = amount;
      }

      if (newStock < 0) {
        const error = new Error("Insufficient stock for this adjustment");
        error.statusCode = 400;
        throw error;
      }

      const update =
        action === "set"
          ? { $set: { "sizes.$.stock": newStock } }
          : {
              $inc: {
                "sizes.$.stock": action === "increase" ? amount : -amount,
              },
            };

      const stockFilter = {
        _id: variantId,
        "sizes._id": sizeOptionId,
      };

      if (action === "decrease") {
        stockFilter.sizes = {
          $elemMatch: {
            _id: sizeOptionId,
            stock: { $gte: amount },
          },
        };
        delete stockFilter["sizes._id"];
      }

      const updatedVariant = await ProductVariant.findOneAndUpdate(
        stockFilter,
        update,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!updatedVariant) {
        const error = new Error("Stock could not be updated. Please refresh and try again.");
        error.statusCode = 409;
        throw error;
      }

      const product = await Product.findById(variant.productId)
        .select("name")
        .session(session);

      const quantityChange = newStock - previousStock;

      const [log] = await InventoryLog.create(
        [
          {
            productId: variant.productId,
            variantId: variant._id,
            sizeOptionId: sizeOption._id,
            productName: product?.name || "",
            color: variant.color,
            size: sizeOption.size,
            sku: sizeOption.sku || "",
            action,
            quantityChange,
            previousStock,
            newStock,
            reason: String(reason).trim(),
            performedBy: performedBy || null,
          },
        ],
        { session }
      );

      result = {
        log,
        stock: newStock,
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
}

async function getHistory(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit, 10) || 20)
  );

  const filter = {};

  if (query.productId && mongoose.isValidObjectId(query.productId)) {
    filter.productId = query.productId;
  }

  if (query.variantId && mongoose.isValidObjectId(query.variantId)) {
    filter.variantId = query.variantId;
  }

  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("productId", "name slug")
      .lean(),

    InventoryLog.countDocuments(filter),
  ]);

  return {
    logs,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

module.exports = {
  adjustStock,
  getHistory,
};