
const Cart = require("../../models/Cart");
const User = require("../../models/User");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const Address = require("../../models/Address");
const ShippingRate = require("../../models/ShippingRate");
const PaymentSetting = require("../../models/PaymentSettings");
const Order = require("../../models/Order");

async function findCart(userId, session = null) {
  let query = Cart.findOne({ userId });

  if (session) query = query.session(session);

  return query;
}

async function findUser(userId) {
  return User.findById(userId)
    .select("name email phone isActive");
}

async function findAddress(addressId, userId) {
  return Address.findOne({
    _id: addressId,
    userId
  }).lean();
}

async function findProduct(productId, session = null) {
  let query = Product.findById(productId);

  if (session) query = query.session(session);

  return query;
}

async function findVariant(variantId, session = null) {
  let query = ProductVariant.findById(variantId);

  if (session) query = query.session(session);

  return query;
}

async function findShippingRate(country, city) {
  return ShippingRate.findOne({
    country: { $regex: `^${escapeRegex(country.trim())}$`, $options: "i" },
    city: { $regex: `^${escapeRegex(city.trim())}$`, $options: "i" },
    isActive: true
  }).lean();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findPaymentSettings() {
  return PaymentSetting.findOne({ key: "default" }).lean();
}

async function createOrder(data, session) {
  const [order] = await Order.create([data], { session });
  return order;
}

async function reserveStock(items, session) {
  for (const item of items) {
    const result = await ProductVariant.updateOne(
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
          "sizes.$[size].stock": -item.quantity
        }
      },
      {
        arrayFilters: [
          {
            "size._id": item.sizeOptionId,
            "size.stock": { $gte: item.quantity },
            "size.isActive": true
          }
        ],
        session
      }
    );

    if (result.modifiedCount !== 1) {
      const error = new Error(
        `Insufficient stock or unavailable size for ${item.productName}`
      );
      error.statusCode = 409;
      throw error;
    }
  }
}

async function clearCart(userId, session) {
  return Cart.updateOne(
    { userId },
    { $set: { items: [] } },
    { session }
  );
}

module.exports = {
  findCart,
  findUser,
  findAddress,
  findProduct,
  findVariant,
  findShippingRate,
  findPaymentSettings,
  createOrder,
  reserveStock,
  clearCart
};
