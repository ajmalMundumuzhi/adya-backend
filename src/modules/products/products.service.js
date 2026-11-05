
const mongoose = require("mongoose");
const repository = require("./products.repository");

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.search) {
    const search = String(query.search).trim();
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { slug: { $regex: escapedSearch, $options: "i" } },
      { sku: { $regex: escapedSearch, $options: "i" } }
    ];
  }

  if (query.categoryId && mongoose.isValidObjectId(query.categoryId)) {
    filter.categoryId = query.categoryId;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  const [products, total] = await Promise.all([
    repository.findAll(filter).skip(skip).limit(limit),
    repository.count(filter)
  ]);

  const productIds = products.map(product => product._id);
  const variants = productIds.length
    ? await repository.findVariants(productIds)
    : [];

  const productsWithVariants = products.map(product => ({
    ...product,
    variants: variants.filter(
      variant => variant.productId.toString() === product._id.toString()
    )
  }));

  return {
    products: productsWithVariants,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getById(id) {
  const product = await repository.findById(id);

  if (!product) {
    return null;
  }

  const variants = await repository.findVariantsByProductId(product._id);

  return {
    ...product,
    variants
  };
}

async function create(data) {
  const { variants = [], ...productData } = data;

  const product = await repository.create(productData);

  if (variants.length) {
    await repository.createVariants(product._id, variants);
  }

  return getById(product._id);
}

async function update(id, data) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid product ID", 400);
  }

  const { variants, ...productData } = data;

  const product = await repository.update(id, productData);

  if (!product) {
    return null;
  }

  if (variants !== undefined) {
    await repository.deleteVariants(product._id);

    if (variants.length) {
      await repository.createVariants(product._id, variants);
    }
  }

  return getById(product._id);
}

async function deactivate(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid product ID", 400);
  }

  const product = await repository.deactivate(id);

  if (!product) {
    return null;
  }

  await repository.deactivateVariants(id);

  return product;
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate
};
