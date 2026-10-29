
const mongoose = require("mongoose");
const repository = require("./orders.repository");
const Product = require("../../models/Product");

function makeError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

async function listOrders() {
  return repository.findAll();
}

async function getOrder(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid order ID", 400);
  }

  const order = await repository.findById(id);
  if (!order) throw makeError("Order not found", 404);
  return order;
}

async function createOrder(data) {
  const requestedById = new Map();

  for (const item of data.items) {
    if (!mongoose.isValidObjectId(item.productId)) {
      throw makeError("Invalid product ID", 400);
    }

    const key = item.productId.toString();
    requestedById.set(key, (requestedById.get(key) || 0) + item.quantity);
  }

  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const items = [];

      for (const [productId, quantity] of requestedById) {
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            stock: { $gte: quantity }
          },
          { $inc: { stock: -quantity } },
          { new: true, session }
        ).populate({ path: "offerId", options: { session } });

        if (!product) {
          const existing = await Product.findById(productId).session(session);

          if (!existing || !existing.isActive) {
            throw makeError("One or more products are unavailable", 400);
          }

          throw makeError(`Insufficient stock for ${existing.name}`, 400);
        }

        let unitPrice = product.price;
        const offer = product.offerId;

        if (offer) {
          if (
            typeof offer.discountPercentage === "number" &&
            offer.discountPercentage > 0
          ) {
            unitPrice *= 1 - offer.discountPercentage / 100;
          } else if (
            typeof offer.discountAmount === "number" &&
            offer.discountAmount > 0
          ) {
            unitPrice -= offer.discountAmount;
          }
        }

        unitPrice = Math.max(
          0,
          Math.round((unitPrice + Number.EPSILON) * 100) / 100
        );

        for (const item of data.items.filter(
          entry => entry.productId.toString() === productId
        )) {
          items.push({
            productId: product._id,
            productName: product.name,
            image: product.imagePath || product.images?.[0] || "",
            quantity: item.quantity,
            unitPrice,
            subtotal: Math.round(
              (unitPrice * item.quantity + Number.EPSILON) * 100
            ) / 100
          });
        }
      }

      const totalAmount = Math.round(
        (items.reduce((sum, item) => sum + item.subtotal, 0) +
          Number.EPSILON) * 100
      ) / 100;

      const orders = await repository.create([{
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        phone: data.phone,
        shippingAddress: data.shippingAddress,
        items,
        totalAmount,
        trackingProvider: "",
        trackingNumber: "",
        trackingUrl: "",
        status: "pending"
      }], { session });

      createdOrder = orders[0];
    });
  } finally {
    await session.endSession();
  }

  return createdOrder;
}

async function updateOrder(id, data) {
  const session = await mongoose.startSession();
  let updatedOrder;

  try {
    await session.withTransaction(async () => {
      const order = await repository.findById(id, { session });

      if (!order) {
        throw makeError("Order not found", 404);
      }

      if (
        !mongoose.isValidObjectId(id)
      ) {
        throw makeError("Invalid order ID", 400);
      }

      if (
        ["cancelled", "delivered"].includes(order.status) &&
        data.status &&
        data.status !== order.status
      ) {
        throw makeError("This order status cannot be changed", 409);
      }

      if (data.status === "shipped" &&
          !(data.trackingNumber || order.trackingNumber)) {
        throw makeError("A tracking number is required before shipping", 400);
      }

      if (data.status === "cancelled" && order.status !== "cancelled") {
        for (const [productId, quantity] of order.items.reduce((map, item) => {
          const key = item.productId?.toString();
          if (key) map.set(key, (map.get(key) || 0) + item.quantity);
          return map;
        }, new Map())) {
          const product = await Product.findByIdAndUpdate(
            productId,
            { $inc: { stock: quantity } },
            { new: true, session }
          );

          if (!product) {
            throw makeError(
              "Cannot restore stock because a product no longer exists",
              409
            );
          }
        }
      }

      order.set(data);
      await order.save({ session });
      updatedOrder = order;
    });
  } finally {
    await session.endSession();
  }

  return updatedOrder;
}

module.exports = { listOrders, getOrder, createOrder, updateOrder };
