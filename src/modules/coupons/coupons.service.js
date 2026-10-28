const mongoose = require("mongoose");
const repository = require("./coupons.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listCoupons(includeAll = false) {
  return repository.findAll(includeAll ? {} : {
    isActive: true,
    visibility: "public",
    $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }]
  });
}

async function getCoupon(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid coupon ID", 400);
  }

  const coupon = await repository.findById(id);
  if (!coupon) throw makeError("Coupon not found", 404);
  return coupon;
}

async function createCoupon(data) {
  if (data.discountType === "percent" && data.discountAmount > 100) {
    throw makeError("Percentage discount cannot exceed 100", 400);
  }

  if (await repository.findByCode(data.code)) {
    throw makeError("Coupon code already exists", 409);
  }

  return repository.create(data);
}

async function updateCoupon(id, data) {
  const current = await getCoupon(id);
  const type = data.discountType || current.discountType;
  const amount = data.discountAmount ?? current.discountAmount;

  if (type === "percent" && amount > 100) {
    throw makeError("Percentage discount cannot exceed 100", 400);
  }

  if (data.code) {
    const existing = await repository.findByCode(data.code);
    if (existing && existing._id.toString() !== id) {
      throw makeError("Coupon code already exists", 409);
    }
  }

  return repository.update(id, data);
}

async function deleteCoupon(id) {
  await getCoupon(id);
  await repository.remove(id);
}

async function validateCoupon(code, orderAmount) {
  const coupon = await repository.findByCode(code);

  if (!coupon || !coupon.isActive) {
    throw makeError("Invalid or inactive coupon", 400);
  }

  if (coupon.visibility !== "public") {
    throw makeError("This coupon is not publicly available", 400);
  }

  if (coupon.expiryDate && coupon.expiryDate <= new Date()) {
    throw makeError("Coupon has expired", 400);
  }

  const discount = coupon.discountType === "percent"
    ? orderAmount * coupon.discountAmount / 100
    : coupon.discountAmount;

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount: coupon.discountAmount,
    calculatedDiscount: Math.min(discount, orderAmount),
    finalAmount: Math.max(0, orderAmount - discount)
  };
}

module.exports = {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
};
