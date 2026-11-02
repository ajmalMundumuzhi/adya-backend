const mongoose = require("mongoose");
const repository = require("./checkout.repository");
const currencyService = require("../currency/currency.service");
const PaymentTransaction = require("../../models/PaymentTransaction");
const { getStripeClient } = require("../payment-transaction/stripe.client");

const BASE_CURRENCY = "AUD";

function createError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function toMinorUnits(amount) {
  return Math.round(roundMoney(amount) * 100);
}

async function createStripeCheckout(userId, data) {
  const settings = await repository.findPaymentSettings();

  if (!settings?.stripe?.enabled) {
    throw createError("Stripe payments are currently unavailable", 400);
  }

  const checkout = await require("./checkout.service").buildCheckoutForStripe(
    userId,
    data
  );

  const { stripe } = await getStripeClient();
  const currency = checkout.currency.toLowerCase();

  const lineItems = checkout.items.map(item => ({
    quantity: item.quantity,
    price_data: {
      currency,
      unit_amount: toMinorUnits(item.unitPrice),
      product_data: {
        name: `${item.productName} - ${item.variantColor} - ${item.selectedSize}`,
        images: item.image?.startsWith("https://") ? [item.image] : []
      }
    }
  }));

  if (checkout.shippingCharge > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toMinorUnits(checkout.shippingCharge),
        product_data: {
          name: "Shipping"
        }
      }
    });
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    customer_email: checkout.user.email,
    metadata: {
      customerId: userId.toString()
    }
  });

  const dbSession = await mongoose.startSession();

  let order;
  let transaction;

  try {
    await dbSession.withTransaction(async () => {
      await repository.reserveStock(checkout.items, dbSession);

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
        totalAmountAUD: checkout.totalAmountAUD,
        exchangeRate: checkout.exchangeRate,
        exchangeRateDate: checkout.rateData.rateDate,
        exchangeRateFetchedAt: checkout.rateData.fetchedAt,
        subtotal: checkout.subtotal,
        shippingCharge: checkout.shippingCharge,
        totalAmount: checkout.totalAmount,
        currency: checkout.currency,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending"
      };

      const createdOrders = await repository.createOrder(
        orderData,
        dbSession
      );

      order = createdOrders;

      const createdTransactions = await PaymentTransaction.create(
        [{
          orderId: order._id,
          customerId: userId,
          paymentMethod: "stripe",
          transactionType: "payment",
          status: "initiated",
          amount: checkout.totalAmount,
          currency: checkout.currency,
          stripeCheckoutSessionId: stripeSession.id,
          metadata: {
            baseAmountAUD: checkout.totalAmountAUD,
            exchangeRate: checkout.exchangeRate,
            exchangeRateDate: checkout.rateData.rateDate
          }
        }],
        { session: dbSession }
      );

      transaction = createdTransactions[0];

      order.paymentTransactionId = transaction._id;
      await order.save({ session: dbSession });

      await repository.clearCart(userId, dbSession);
    });

    await stripe.checkout.sessions.update(stripeSession.id, {
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        customerId: userId.toString()
      }
    });

    return {
      orderId: order._id,
      transactionId: transaction._id,
      checkoutSessionId: stripeSession.id,
      checkoutUrl: stripeSession.url,
      currency: checkout.currency,
      amount: checkout.totalAmount
    };
  } catch (error) {
    try {
      await stripe.checkout.sessions.expire(stripeSession.id);
    } catch (expireError) {
      console.error("Could not expire unused Stripe session:", expireError.message);
    }

    throw error;
  } finally {
    await dbSession.endSession();
  }
}

module.exports = { createStripeCheckout };