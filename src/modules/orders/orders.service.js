const mongoose = require("mongoose");
const repository = require("./orders.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
  const items = data.items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    image: item.image,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return repository.create({
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    phone: data.phone,
    shippingAddress: data.shippingAddress,
    items,
    totalAmount,
    trackingProvider: data.trackingProvider,
    trackingNumber: data.trackingNumber,
    trackingUrl: data.trackingUrl,
    status: "pending"
  });
}

async function updateOrder(id, data) {
  const order = await getOrder(id);

  if (["cancelled", "delivered"].includes(order.status) && data.status && data.status !== order.status) {
    throw makeError("This order status cannot be changed", 409);
  }

  if (data.status === "shipped" && !data.trackingNumber) {
    const hasTracking = data.trackingNumber === undefined && order.trackingNumber;
    if (!hasTracking) {
      throw makeError("A tracking number is required before shipping", 400);
    }
  }

  return repository.update(id, data);
}

module.exports = { listOrders, getOrder, createOrder, updateOrder };
