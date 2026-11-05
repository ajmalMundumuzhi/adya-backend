const mongoose = require("mongoose");
const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");

function populateProduct(query) {
  return query
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId", "name discountPercentage discountAmount");
}

function findAll(filter = {}) {
  return populateProduct(Product.find(filter))
    .sort({ createdAt: -1 })
    .lean();
}

function count(filter = {}) {
  return Product.countDocuments(filter);
}

function findById(id) {
  const filter = mongoose.isValidObjectId(id)
    ? { _id: id }
    : { slug: String(id).trim() };

  return populateProduct(Product.findOne(filter)).lean();
}

function findVariants(productIds) {
  return ProductVariant.find({
    productId: { $in: productIds }
  }).lean();
}

function findVariantsByProductId(productId) {
  return ProductVariant.find({
    productId,
    isActive: true
  }).lean();
}

async function create(data) {
  return Product.create(data);
}

async function createVariants(productId, variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error("At least one product variant is required");
  }

  const documents = variants.map((variant) => ({
    productId,
    color: variant.color,
    images: variant.images || [],
    sizes: variant.sizes,
    isActive: variant.isActive !== false
  }));

  const insertedVariants = await ProductVariant.insertMany(documents, {
    ordered: true
  });

  if (insertedVariants.length !== documents.length) {
    throw new Error("Not all product variants were saved");
  }

  return insertedVariants;
}

function update(id, data) {
  return Product.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  })
    .populate("categoryId", "name slug")
    .populate("subcategoryIds", "name slug")
    .populate("offerId", "name discountPercentage discountAmount");
}

function deleteVariants(productId) {
  return ProductVariant.deleteMany({ productId });
}

function deactivateVariants(productId) {
  return ProductVariant.updateMany(
    { productId },
    { $set: { isActive: false } }
  );
}

function deactivate(id) {
  return Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { returnDocument: "after" }
  );
}

function deleteProduct(productId) {
  return Product.findByIdAndDelete(productId);
}

module.exports = {
  findAll,
  count,
  findById,
  findVariants,
  findVariantsByProductId,
  create,
  createVariants,
  update,
  deleteVariants,
  deactivateVariants,
  deactivate,
  deleteProduct
};