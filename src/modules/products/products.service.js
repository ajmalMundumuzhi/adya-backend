
const mongoose = require("mongoose");
const repository = require("./products.repository");

const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");
const InventoryLog = require("../../models/InventoryLogs");
const ProductReview = require("../../models/ProductReview");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Wishlist = require("../../models/Wishlist");

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
      variant =>
        variant.productId.toString() === product._id.toString()
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
  const { variants, ...productData } = data;

  if (!Array.isArray(variants) || variants.length === 0) {
    throw makeError("At least one product variant is required", 400);
  }

  let product;

  try {
    product = await repository.create(productData);

    const insertedVariants = await repository.createVariants(
      product._id,
      variants
    );

    if (!insertedVariants.length) {
      throw new Error("Product variants were not saved");
    }

    const savedProduct = await getById(product._id);

    if (!savedProduct || savedProduct.variants.length === 0) {
      throw new Error(
        "Product was created, but variants could not be retrieved"
      );
    }

    return savedProduct;
  } catch (error) {
    if (product?._id) {
      await Promise.all([
        repository.deleteVariants(product._id),
        repository.deleteProduct(product._id)
      ]).catch((cleanupError) => {
        console.error("Product creation cleanup failed:", cleanupError);
      });
    }

    throw error;
  }
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

async function deletePermanently(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError("Invalid product ID", 400);
  }

  const session = await mongoose.startSession();

  let deletedProduct = null;

  try {
    await session.withTransaction(async () => {
      const product = await Product.findById(id).session(session);

      if (!product) {
        throw makeError("Product not found", 404);
      }

      const existingOrder = await Order.exists({
        "items.productId": product._id
      }).session(session);

      if (existingOrder) {
        throw makeError(
          "This product cannot be permanently deleted because it is referenced by an existing order.",
          409
        );
      }

      await Cart.updateMany(
        { "items.productId": product._id },
        {
          $pull: {
            items: { productId: product._id }
          }
        },
        { session }
      );

      await Wishlist.deleteMany(
        { productId: product._id },
        { session }
      );

      await ProductReview.deleteMany(
        { productId: product._id },
        { session }
      );

      await InventoryLog.deleteMany(
        { productId: product._id },
        { session }
      );

      await ProductVariant.deleteMany(
        { productId: product._id },
        { session }
      );

      deletedProduct = await Product.findByIdAndDelete(
        product._id,
        { session }
      );

      if (!deletedProduct) {
        throw makeError("Product not found", 404);
      }
    });

    return deletedProduct;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
  deletePermanently
};
