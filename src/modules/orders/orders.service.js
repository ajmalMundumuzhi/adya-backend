
const mongoose = require("mongoose");

const Order = require("../../models/Order");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const Address = require("../../models/Address");
const User = require("../../models/User");
const ShippingRate = require("../../models/ShippingRate");
const { getCurrencyRates } = require("../currency/currency.service");

const roundMoney = value =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createOrderNumber() {
  return `ADY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function findMatchingSlab(slabs, totalWeightGrams) {
  return slabs.find(slab => {
    const min = Number(slab.minWeightGrams);
    const max = Number(slab.maxWeightGrams);

    return totalWeightGrams > min && totalWeightGrams <= max;
  });
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
    throw createError(
      "A selected product size is unavailable or has insufficient stock",
      409
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
      throw createError(
        `Unable to restore stock for ${item.productName}`,
        409
      );
    }
  }

  order.stockReserved = false;
  order.stockReservationExpiresAt = null;
}

async function getCountryConfig(country, session) {
  const countryConfig = await ShippingRate.findOne({
    $or: [
      { country: new RegExp(`^${String(country).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { countryCode: String(country).toUpperCase() }
    ],
    isActive: true
  }).session(session);

  if (!countryConfig) {
    throw createError("Shipping is not available for this country", 404);
  }

  return countryConfig;
}

async function calculateShipping(countryConfig, city, totalWeightGrams) {
  const cityConfig = countryConfig.cityOverrides.find(
    entry =>
      entry.isActive &&
      normalize(entry.city) === normalize(city)
  );

  const slabs = cityConfig
    ? cityConfig.weightSlabs
    : countryConfig.weightSlabs;

  const slab = findMatchingSlab(slabs, totalWeightGrams);

  if (!slab) {
    throw createError(
      `Shipping is not configured for a total weight of ${totalWeightGrams}g`,
      422
    );
  }

  return {
    rate: Number(slab.rate),
    totalWeightGrams,
    shippingSlab: {
      label: slab.label,
      minWeightGrams: slab.minWeightGrams,
      maxWeightGrams: slab.maxWeightGrams,
      rate: slab.rate,
      rateType: cityConfig ? "city" : "country",
      city: cityConfig?.city || null
    }
  };
}

async function createOrder(data) {
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const customerId = data.customerId;

      if (!customerId) {
        throw createError("Customer authentication is required", 401);
      }

      const address = await Address.findOne({
        _id: data.addressId,
        userId: customerId
      }).session(session);

      if (!address) {
        throw createError("Delivery address was not found", 404);
      }

      const countryConfig = await getCountryConfig(
        address.country,
        session
      );

      if (data.currency !== countryConfig.currency) {
        throw createError(
          "Selected currency does not match the delivery country"
        );
      }

      const user = await User.findById(customerId).session(session);

      if (!user) {
        throw createError("Customer account was not found", 404);
      }

      const customerEmail = user.email || user.customerEmail;

      if (!customerEmail) {
        throw createError("Your account does not have an email address");
      }

      const currencyData = await getCurrencyRates(data.currency);

      const exchangeRate = Number(
        currencyData.exchangeRate ??
        currencyData.rates?.[data.currency] ??
        1
      );

      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        throw createError("Unable to obtain a valid exchange rate");
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
        throw createError("Maximum quantity per product size is 100");
      }

      const orderItems = [];
      let subtotalAUD = 0;
      let totalWeightGrams = 0;

      for (const item of requestedItems) {
        const product = await Product.findOne({
          _id: item.productId,
          isActive: true
        }).session(session);

        if (!product) {
          throw createError("A selected product is no longer available", 404);
        }

        const variant = await reserveVariantStock(item, session);
        const sizeOption = variant.sizes.id(item.sizeOptionId);

        if (!sizeOption || !sizeOption.isActive) {
          throw createError("A selected size is no longer available", 404);
        }

        const unitPriceAUD = Number(sizeOption.price);
        const weightGrams = Number(sizeOption.weightGrams);

        if (!Number.isFinite(unitPriceAUD) || unitPriceAUD < 0) {
          throw createError("Invalid product price");
        }

        if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
          throw createError(
            `A valid weight is missing for ${product.name}`
          );
        }

        const itemWeightGrams = weightGrams * item.quantity;
        totalWeightGrams += itemWeightGrams;

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
          weightGrams,
          totalWeightGrams: itemWeightGrams,
          unitPriceAUD,
          unitPrice,
          subtotal: itemSubtotal
        });
      }

      subtotalAUD = roundMoney(subtotalAUD);
      totalWeightGrams = Math.ceil(totalWeightGrams);

      const shipping = await calculateShipping(
        countryConfig,
        address.city,
        totalWeightGrams
      );

      const shippingChargeAUD = roundMoney(shipping.rate);
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
        country: countryConfig.country
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
        country: countryConfig.country,
        city: address.city,
        totalWeightGrams,
        shippingSlab: shipping.shippingSlab,
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
        throw createError("Order not found", 404);
      }

      if (["delivered", "cancelled"].includes(order.status)) {
        throw createError("This order can no longer be updated", 409);
      }

      if (
        data.status === "shipped" &&
        !data.trackingNumber &&
        !order.trackingNumber
      ) {
        throw createError(
          "A tracking number is required before shipping"
        );
      }

      const updateFields = {};

      if (data.status === "cancelled") {
        if (order.paymentStatus === "paid") {
          throw createError(
            "A paid order must be refunded before cancellation",
            409
          );
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
        throw createError("Order not found", 404);
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

  if (!order) {
    throw createError("Order not found", 404);
  }

  return order;
}

async function listCustomerOrders(customerId) {
  return Order.find({ customerId }).sort({ createdAt: -1 });
}

async function getCustomerOrder(id, customerId) {
  const order = await Order.findOne({ _id: id, customerId });

  if (!order) {
    throw createError("Order not found", 404);
  }

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
