const repository = require("./products.repository");

function filterVariants(variants, query) {
  return variants
    .filter((variant) => {
      if (variant.isActive === false) return false;

      if (
        query.color &&
        !String(variant.color || "")
          .toLowerCase()
          .includes(String(query.color).toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .map((variant) => {
      const sizes = (variant.sizes || []).filter((size) => {
        if (size.isActive === false) return false;

        if (
          query.minPrice !== undefined &&
          size.price < Number(query.minPrice)
        ) {
          return false;
        }

        if (
          query.maxPrice !== undefined &&
          size.price > Number(query.maxPrice)
        ) {
          return false;
        }

        if (query.inStock === "true" && size.stock <= 0) {
          return false;
        }

        if (
          query.onSale === "true" &&
          !(size.compareAtPrice > size.price)
        ) {
          return false;
        }

        return true;
      });

      return {
        ...variant,
        sizes,
      };
    })
    .filter((variant) => variant.sizes.length > 0);
}

function formatProduct(product, variants) {
  const allSizes = variants.flatMap((variant) => variant.sizes || []);

  const prices = allSizes.map((size) => Number(size.price));

  const lowestPricedSize = allSizes.reduce((lowest, size) => {
    if (!lowest || Number(size.price) < Number(lowest.price)) {
      return size;
    }

    return lowest;
  }, null);

  const firstVariant = variants[0];

  const allImages = variants.flatMap((variant) => variant.images || []);

  return {
    ...product,
    variants,
    price: prices.length ? Math.min(...prices) : 0,
    compareAtPrice: lowestPricedSize?.compareAtPrice ?? null,
    imagePath: firstVariant?.images?.[0] || null,
    images: allImages,
    stock: allSizes.reduce(
      (total, size) => total + Number(size.stock || 0),
      0
    ),
  };
}

async function list(query) {
  const page = Math.max(
    1,
    Number.parseInt(query.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit, 10) || 12)
  );

  const filter = {
    isActive: true,
  };

  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.search) {
    filter.$text = {
      $search: String(query.search),
    };
  }

  const products = await repository.findAll(filter);

  if (!products.length) {
    return {
      products: [],
      page,
      limit,
      total: 0,
      pages: 0,
    };
  }

  const productIds = products.map((product) => product._id);

  const allVariants = await repository.findVariants(productIds);

  const variantsByProduct = new Map();

  for (const variant of allVariants) {
    const key = String(variant.productId);

    if (!variantsByProduct.has(key)) {
      variantsByProduct.set(key, []);
    }

    variantsByProduct.get(key).push(variant);
  }

  let formattedProducts = products
    .map((product) => {
      const variants = filterVariants(
        variantsByProduct.get(String(product._id)) || [],
        query
      );

      if (!variants.length) return null;

      return formatProduct(product, variants);
    })
    .filter(Boolean);

  if (query.sort === "price-low") {
    formattedProducts.sort((a, b) => a.price - b.price);
  } else if (query.sort === "price-high") {
    formattedProducts.sort((a, b) => b.price - a.price);
  } else {
    formattedProducts.sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  const total = formattedProducts.length;

  const startIndex = (page - 1) * limit;

  formattedProducts = formattedProducts.slice(
    startIndex,
    startIndex + limit
  );

  return {
    products: formattedProducts,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

async function getById(id) {
  const product = await repository.findById(id);

  if (!product || product.isActive === false) {
    return null;
  }

  const variants = await repository.findVariantsByProductId(
    product._id
  );

  const activeVariants = filterVariants(variants, {});

  if (!activeVariants.length) {
    return {
      ...product,
      variants: [],
      price: 0,
      compareAtPrice: null,
      imagePath: null,
      images: [],
      stock: 0,
    };
  }

  return formatProduct(product, activeVariants);
}

async function create(data) {
  const { variants, ...productData } = data;

  const product = await repository.create(productData);

  try {
    const createdVariants = await repository.createVariants(
      product._id,
      variants
    );

    return formatProduct(
      product.toObject(),
      createdVariants.map((variant) => variant.toObject())
    );
  } catch (error) {
    await repository.deactivate(product._id);
    throw error;
  }
}

async function update(id, data) {
  const { variants, ...productData } = data;

  let product;

  if (Object.keys(productData).length > 0) {
    product = await repository.update(id, productData);
  } else {
    product = await repository.findById(id);
  }

  if (!product) return null;

  const productId = product._id;

  if (variants !== undefined) {
    await repository.deleteVariants(productId);

    await repository.createVariants(productId, variants);
  }

  return getById(productId);
}

async function deactivate(id) {
  const product = await repository.deactivate(id);

  if (!product) return null;

  await repository.deactivateVariants(product._id);

  return product;
}

module.exports = {
  list,
  getById,
  create,
  update,
  deactivate,
};