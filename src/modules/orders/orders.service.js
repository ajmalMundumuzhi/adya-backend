
const mongoose = require("mongoose");

const Order = require("../../models/Order");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const Address = require("../../models/Address");
const User = require("../../models/User");
const ShippingRate = require("../../models/ShippingRate");
const { getCurrencyRates } = require("../currency/currency.service");

const SUPPORTED_COUNTRIES = {
  Australia: "AUD",
  "New Zealand": "NZD",
  "United States": "USD",
  Canada: "CAD",
  "United Kingdom": "GBP",
  Malaysia: "MYR",
  Singapore: "SGD"
};

const roundMoney = value =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function createOrderNumber() {
  return `ADY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeCountry(country) {
  const value = String(country || "").trim().toLowerCase();

  const aliases = {
    australia: "Australia",
    au: "Australia",
    "new zealand": "New Zealand",
    nz: "New Zealand",
    "united states": "United States",
    "united states of america": "United States",
    usa: "United States",
    us: "United States",
    canada: "Canada",
    ca: "Canada",
    "united kingdom": "United Kingdom",
    uk: "United Kingdom",
    gb: "United Kingdom",
    malaysia: "Malaysia",
    my: "Malaysia",
    singapore: "Singapore",
    sg: "Singapore"
  };

  return aliases[value] || null;
}

async function reserveVariantStock(item, session) {
  const variant = await ProductVariant.findOneAndUpdate(
    {
      _id: item.variantId,
      productId: item.productId,
      isActive: true,
      sizes: {
        $elemMatch: {
          _id: item.sizeOptionId,
          isActive: true,
          stock: { $gte: item.quantity }
        }
      }
    },
    {
      $inc: {
        "sizes.$.stock": -item.quantity
      }
    },
    {
      returnDocument: "after",
      runValidators: true,
      session
    }
  );

  if (!variant) {
    throw new Error(
      "A selected product size is unavailable or has insufficient stock"
    );
  }

  return variant;
}

async function releaseOrderStock(order, session) {
  if (!order.stockReserved) return;

  for (const item of order.items) {
    const result = await ProductVariant.updateOne(
      {
        _id: item.variantId,
        productId: item.productId,
        "sizes._id": item.sizeOptionId
      },
      {
        $inc: {
          "sizes.$.stock": item.quantity
        }
      },
      { session }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Unable to restore stock for ${item.productName}`);
    }
  }

  order.stockReserved = false;
  order.stockReservationExpiresAt = null;
}

async function createOrder(data) {
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const customerId = data.customerId;

      if (!customerId) {
        throw new Error("Customer authentication is required");
      }

      const address = await Address.findOne({
        _id: data.addressId,
        userId: customerId
      }).session(session);

      if (!address) {
        throw new Error("Delivery address was not found");
      }

      const country = normalizeCountry(address.country);

      if (!country) {
        throw new Error(
          "Delivery is available only in the seven supported countries"
        );
      }

      const expectedCurrency = SUPPORTED_COUNTRIES[country];

      if (data.currency !== expectedCurrency) {
        throw new Error("Selected currency does not match the delivery country");
      }

      const user = await User.findById(customerId).session(session);

      if (!user) {
        throw new Error("Customer account was not found");
      }

      const customerEmail = user.email || user.customerEmail;

      if (!customerEmail) {
        throw new Error("Your account does not have an email address");
      }

      const shippingRate = await ShippingRate.findOne({
        country,
        city: address.city.trim(),
        isActive: true
      }).session(session);

      if (!shippingRate) {
        throw new Error("Shipping is not available for this city yet");
      }

      const currencyData = await getCurrencyRates(data.currency);

      const exchangeRate = Number(
        currencyData.exchangeRate ??
        currencyData.rates?.[data.currency] ??
        1
      );

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw new Error("Unable to obtain a valid exchange rate");
      }

      const exchangeRateDate =
        currencyData.rateDate || new Date().toISOString().slice(0, 10);

      const exchangeRateFetchedAt = currencyData.fetchedAt
        ? new Date(currencyData.fetchedAt)
        : new Date();

      const mergedItems = new Map();

      for (const item of data.items) {
        const key = `${item.productId}:${item.variantId}:${item.sizeOptionId}`;
        const existing = mergedItems.get(key);

        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedItems.set(key, { ...item });
        }
      }

      const requestedItems = [...mergedItems.values()];

      if (requestedItems.some(item => item.quantity > 100)) {
        throw new Error("Maximum quantity per product size is 100");
      }

      const orderItems = [];
      let subtotalAUD = 0;

      for (const item of requestedItems) {
        const product = await Product.findOne({
          _id: item.productId,
          isActive: true
        }).session(session);

        if (!product) {
          throw new Error("A selected product is no longer available");
        }

        const variant = await reserveVariantStock(item, session);
        const sizeOption = variant.sizes.id(item.sizeOptionId);

        if (!sizeOption || !sizeOption.isActive) {
          throw new Error("A selected size is no longer available");
        }

        const unitPriceAUD = Number(sizeOption.price);

        if (!Number.isFinite(unitPriceAUD) || unitPriceAUD < 0) {
          throw new Error("Invalid product price");
        }

        const unitPrice = roundMoney(unitPriceAUD * exchangeRate);
        const itemSubtotal = roundMoney(unitPrice * item.quantity);

        subtotalAUD += unitPriceAUD * item.quantity;

        orderItems.push({
          productId: product._id,
          variantId: variant._id,
          sizeOptionId: sizeOption._id,
          productName: product.name,
          image: variant.images?.[0] || "",
          variantColor: variant.color,
          selectedSize: sizeOption.size,
          sku: sizeOption.sku || "",
          quantity: item.quantity,
          unitPriceAUD,
          unitPrice,
          subtotal: itemSubtotal
        });
      }

      subtotalAUD = roundMoney(subtotalAUD);

      const shippingChargeAUD = roundMoney(shippingRate.rate);
      const totalAmountAUD = roundMoney(subtotalAUD + shippingChargeAUD);

      const subtotal = roundMoney(subtotalAUD * exchangeRate);
      const shippingCharge = roundMoney(shippingChargeAUD * exchangeRate);
      const totalAmount = roundMoney(subtotal + shippingCharge);

      const shippingAddress = {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country
      };

      const order = new Order({
        orderNumber: createOrderNumber(),
        items: orderItems,
        customerId,
        customerName: address.fullName,
        customerEmail,
        phone: address.phone,
        addressId: address._id,
        shippingAddress,
        country,
        city: address.city,
        subtotalAUD,
        shippingChargeAUD,
        totalAmountAUD,
        exchangeRate,
        exchangeRateDate,
        exchangeRateFetchedAt,
        subtotal,
        shippingCharge,
        totalAmount,
        currency: data.currency,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
        stockReserved: true,
        stockReservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      await order.save({ session });
      createdOrder = order;
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
}

async function updateOrder(id, data) {
  const session = await mongoose.startSession();
  let updatedOrder;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      if (["delivered", "cancelled"].includes(order.status)) {
        const error = new Error("This order can no longer be updated");
        error.statusCode = 409;
        throw error;
      }

      if (
        data.status === "shipped" &&
        !data.trackingNumber &&
        !order.trackingNumber
      ) {
        const error = new Error(
          "A tracking number is required before shipping"
        );
        error.statusCode = 400;
        throw error;
      }

      const updateFields = {};

      if (data.status === "cancelled") {
        if (order.paymentStatus === "paid") {
          const error = new Error(
            "A paid order must be refunded before cancellation"
          );
          error.statusCode = 409;
          throw error;
        }

        await releaseOrderStock(order, session);

        updateFields.paymentStatus = "failed";
        updateFields.stockReserved = false;
        updateFields.stockReservationExpiresAt = null;
      }

      if (data.status !== undefined) {
        updateFields.status = data.status;
      }

      if (data.trackingProvider !== undefined) {
        updateFields.trackingProvider = data.trackingProvider;
      }

      if (data.trackingNumber !== undefined) {
        updateFields.trackingNumber = data.trackingNumber;
      }

      if (data.trackingUrl !== undefined) {
        updateFields.trackingUrl = data.trackingUrl;
      }

      const result = await Order.updateOne(
        { _id: id },
        { $set: updateFields },
        {
          session,
          runValidators: true
        }
      );

      if (result.matchedCount === 0) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      updatedOrder = await Order.findById(id).session(session);
    });

    return updatedOrder;
  } finally {
    await session.endSession();
  }
}

async function listOrders() {
  return Order.find().sort({ createdAt: -1 });
}

async function getOrder(id) {
  const order = await Order.findById(id);

  if (!order) throw new Error("Order not found");

  return order;
}

async function listCustomerOrders(customerId) {
  return Order.find({ customerId }).sort({ createdAt: -1 });
}

async function getCustomerOrder(id, customerId) {
  const order = await Order.findOne({ _id: id, customerId });

  if (!order) throw new Error("Order not found");

  return order;
}

module.exports = {
  createOrder,
  updateOrder,
  listOrders,
  getOrder,
  listCustomerOrders,
  getCustomerOrder
};
