
const mongoose = require("mongoose");
const repository = require("./checkout.repository");
const currencyService = require("../currency/currency.service");
const PaymentTransaction = require("../../models/PaymentTransaction");

const BASE_CURRENCY = "AUD";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function getCurrencyRate(rateData, currency) {
  const rate = rateData.rates[currency];

  if (!Number.isFinite(rate) || rate <= 0) {
    throw createError("Exchange rate unavailable", 503);
  }

  return rate;
}

function convertAmount(amountAUD, exchangeRate) {
  return roundMoney(amountAUD * exchangeRate);
}

async function buildCheckout(userId, data) {
  const user = await repository.findUser(userId);

  if (!user || !user.isActive) {
    throw createError("Customer account is unavailable", 401);
  }

  const address = await repository.findAddress(
    data.addressId,
    userId
  );

  if (!address) {
    throw createError("Delivery address not found", 404);
  }

  const cart = await repository.findCart(userId);

  if (!cart || !cart.items.length) {
    throw createError("Your cart is empty", 400);
  }

  const shippingRate = await repository.findShippingRate(
    address.country,
    address.city
  );

  if (!shippingRate) {
    throw createError(
      "Shipping is not available for this city. Please contact support.",
      400
    );
  }

  const rateData = await currencyService.getRates();
  const exchangeRate = getCurrencyRate(rateData, data.currency);

  const items = [];
  let subtotalAUD = 0;

  for (const cartItem of cart.items) {
    const product = await repository.findProduct(
      cartItem.productId
    );

    if (!product || !product.isActive) {
      throw createError("A product in your cart is unavailable", 400);
    }

    const variant = await repository.findVariant(
      cartItem.variantId
    );

    if (
      !variant ||
      !variant.isActive ||
      !variant.productId.equals(product._id)
    ) {
      throw createError("A product variant is unavailable", 400);
    }

    const size = variant.sizes.id(cartItem.sizeOptionId);

    if (!size || !size.isActive) {
      throw createError("A selected size is unavailable", 400);
    }

    if (size.stock < cartItem.quantity) {
      throw createError(
        `Only ${size.stock} units are available for ${product.name} - ${size.size}`,
        409
      );
    }

    const unitPriceAUD = roundMoney(size.price);
    const itemSubtotalAUD = roundMoney(
      unitPriceAUD * cartItem.quantity
    );

    subtotalAUD += itemSubtotalAUD;

    items.push({
      productId: product._id,
      variantId: variant._id,
      sizeOptionId: size._id,
      productName: product.name,
      image: variant.images?.[0] || null,
      variantColor: variant.color,
      selectedSize: size.size,
      sku: size.sku || "",
      quantity: cartItem.quantity,
      unitPriceAUD,
      unitPrice: convertAmount(unitPriceAUD, exchangeRate),
      subtotal: convertAmount(itemSubtotalAUD, exchangeRate)
    });
  }

  subtotalAUD = roundMoney(subtotalAUD);

  const shippingChargeAUD = roundMoney(shippingRate.rate);
  const totalAmountAUD = roundMoney(
    subtotalAUD + shippingChargeAUD
  );

  const convertedSubtotal = convertAmount(
    subtotalAUD,
    exchangeRate
  );

  const convertedShipping = convertAmount(
    shippingChargeAUD,
    exchangeRate
  );

  const totalAmount = roundMoney(
    convertedSubtotal + convertedShipping
  );

  return {
    user,
    address,
    items,
    rateData,
    exchangeRate,
    subtotalAUD,
    shippingChargeAUD,
    totalAmountAUD,
    subtotal: convertedSubtotal,
    shippingCharge: convertedShipping,
    totalAmount,
    currency: data.currency
  };
}

async function previewCheckout(userId, data) {
  const checkout = await buildCheckout(userId, data);
  const settings = await repository.findPaymentSettings();

  return {
    items: checkout.items,
    address: {
      fullName: checkout.address.fullName,
      phone: checkout.address.phone,
      addressLine1: checkout.address.addressLine1,
      addressLine2: checkout.address.addressLine2,
      city: checkout.address.city,
      state: checkout.address.state,
      postalCode: checkout.address.postalCode,
      country: checkout.address.country
    },
    pricing: {
      baseCurrency: BASE_CURRENCY,
      selectedCurrency: checkout.currency,
      exchangeRate: checkout.exchangeRate,
      exchangeRateDate: checkout.rateData.rateDate,
      exchangeRateFetchedAt: checkout.rateData.fetchedAt,
      isExchangeRateStale: checkout.rateData.isStale,
      subtotalAUD: checkout.subtotalAUD,
      shippingChargeAUD: checkout.shippingChargeAUD,
      totalAmountAUD: checkout.totalAmountAUD,
      subtotal: checkout.subtotal,
      shippingCharge: checkout.shippingCharge,
      totalAmount: checkout.totalAmount
    },
    paymentMethods: {
      cod: Boolean(settings?.cod?.enabled),
      stripe: Boolean(settings?.stripe?.enabled)
    }
  };
}

async function createCodOrder(userId, data) {
  if (data.paymentMethod !== "cod") {
    throw createError(
      "Only COD order creation is available in this checkout stage",
      400
    );
  }

  const checkout = await buildCheckout(userId, data);

  const settings = await repository.findPaymentSettings();

  if (!settings?.cod?.enabled) {
    throw createError("Cash on Delivery is currently unavailable", 400);
  }

  if (
    checkout.totalAmountAUD < settings.cod.minimumOrderAmount ||
    checkout.totalAmountAUD > settings.cod.maximumOrderAmount
  ) {
    throw createError(
      "This order does not meet the Cash on Delivery amount limits",
      400
    );
  }

  const codChargeAUD = roundMoney(
    settings.cod.additionalCharge || 0
  );

  const finalTotalAUD = roundMoney(
    checkout.totalAmountAUD + codChargeAUD
  );

  const finalTotal = convertAmount(
    finalTotalAUD,
    checkout.exchangeRate
  );

  const session = await mongoose.startSession();

  let createdOrder;

  try {
    await session.withTransaction(async () => {
      await repository.reserveStock(
        checkout.items,
        session
      );

      const orderData = {
        items: checkout.items,
        customerId: userId,
        customerName: checkout.user.name,
        customerEmail: checkout.user.email,
        phone: checkout.address.phone || checkout.user.phone || "",
        addressId: checkout.address._id,
        shippingAddress: {
          fullName: checkout.address.fullName,
          phone: checkout.address.phone,
          addressLine1: checkout.address.addressLine1,
          addressLine2: checkout.address.addressLine2,
          city: checkout.address.city,
          state: checkout.address.state,
          postalCode: checkout.address.postalCode,
          country: checkout.address.country
        },
        country: checkout.address.country,
        city: checkout.address.city,
        subtotalAUD: checkout.subtotalAUD,
        shippingChargeAUD: checkout.shippingChargeAUD,
        totalAmountAUD: finalTotalAUD,
        exchangeRate: checkout.exchangeRate,
        exchangeRateDate: checkout.rateData.rateDate,
        exchangeRateFetchedAt: checkout.rateData.fetchedAt,
        subtotal: checkout.subtotal,
        shippingCharge: checkout.shippingCharge,
        totalAmount: finalTotal,
        currency: checkout.currency,
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "pending"
      };

      const order = await repository.createOrder(
        orderData,
        session
      );

      const [transaction] = await PaymentTransaction.create(
        [
          {
            orderId: order._id,
            customerId: userId,
            paymentMethod: "cod",
            transactionType: "payment",
            status: "pending",
            amount: finalTotal,
            currency: checkout.currency,
            metadata: {
              baseAmountAUD: finalTotalAUD,
              exchangeRate: checkout.exchangeRate,
              exchangeRateDate: checkout.rateData.rateDate
            }
          }
        ],
        { session }
      );

      order.paymentTransactionId = transaction._id;
      await order.save({ session });

      await repository.clearCart(userId, session);

      createdOrder = order;
    });
  } finally {
    await session.endSession();
  }

  return createdOrder;
}

module.exports = {
  previewCheckout,
  createCodOrder
};
