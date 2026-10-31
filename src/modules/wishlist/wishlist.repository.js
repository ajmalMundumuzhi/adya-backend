
const Wishlist = require("../../models/Wishlist");

function findByUser(userId) {
  return Wishlist.find({ userId })
    .populate("productId")
    .populate("variantId")
    .sort({ createdAt: -1 })
    .lean();
}

function findOne(filter) {
  return Wishlist.findOne(filter).lean();
}

function add(data) {
  return Wishlist.findOneAndUpdate(
    {
      userId: data.userId,
      productId: data.productId,
      variantId: data.variantId,
      sizeOptionId: data.sizeOptionId
    },
    { $setOnInsert: data },
    { upsert: true, new: true, runValidators: true }
  )
    .populate("productId")
    .populate("variantId")
    .lean();
}

function remove(filter) {
  return Wishlist.deleteOne(filter);
}

module.exports = {
  findByUser,
  findOne,
  add,
  remove
};
