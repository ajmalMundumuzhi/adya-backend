
const mongoose = require("mongoose");
const repository = require("./shipping.repository");
const ProductVariant = require("../../models/ProductVariant");

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function validateSlabs(slabs) {
  if (!Array.isArray(slabs) || slabs.length === 0) {
    throw createError("At least one weight slab is required");
  }

  const sorted = [...slabs].sort(
    (a, b) => Number(a.minWeightGrams) - Number(b.minWeightGrams)
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const slab = sorted[index];
    const min = Number(slab.minWeightGrams);
    const max = Number(slab.maxWeightGrams);
    const rate = Number(slab.rate);

    if (
      !slab.label ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      !Number.isFinite(rate) ||
      min < 0 ||
      max <= min ||
      rate < 0
    ) {
      throw createError("One or more weight slabs contain invalid values");
    }

    if (
      index > 0 &&
      min < Number(sorted[index - 1].maxWeightGrams)
    ) {
      throw createError("Weight slabs cannot overlap");
    }
  }

  return sorted;
}

async function listAll() {
  return repository.findAll();
}

async function listActiveCountries() {
  return repository.findActiveCountries();
}

async function getById(id) {
  const country = await repository.findById(id);

  if (!country) {
    throw createError("Shipping country not found", 404);
  }

  return country;
}

async function createCountry(data) {
  const existing = await repository.findByCountryCode(data.countryCode);

  if (existing) {
    throw createError("A country with this country code already exists", 409);
  }

  const weightSlabs = validateSlabs(data.weightSlabs);

  const cityNames = new Set();

  const cityOverrides = (data.cityOverrides || []).map(city => {
    const key = normalize(city.city);

    if (!key) {
      throw createError("City name is required");
    }

    if (cityNames.has(key)) {
      throw createError(`Duplicate city: ${city.city}`);
    }

    cityNames.add(key);

    return {
      city: city.city.trim(),
      weightSlabs: validateSlabs(city.weightSlabs),
      isActive: city.isActive !== false
    };
  });

  return repository.create({
    ...data,
    country: data.country.trim(),
    countryCode: data.countryCode.toUpperCase(),
    currency: data.currency.toUpperCase(),
    weightSlabs,
    cityOverrides
  });
}

async function updateCountry(id, data) {
  const country = await getById(id);

  if (
    data.countryCode &&
    data.countryCode.toUpperCase() !== country.countryCode
  ) {
    const existing = await repository.findByCountryCode(data.countryCode);

    if (existing && String(existing._id) !== String(id)) {
      throw createError("Another country already uses this country code", 409);
    }
  }

  if (data.weightSlabs) {
    data.weightSlabs = validateSlabs(data.weightSlabs);
  }

  if (data.cityOverrides) {
    const cityNames = new Set();

    data.cityOverrides = data.cityOverrides.map(city => {
      const key = normalize(city.city);

      if (!key || cityNames.has(key)) {
        throw createError("City names must be present and unique");
      }

      cityNames.add(key);

      return {
        ...(city._id ? { _id: city._id } : {}),
        city: city.city.trim(),
        weightSlabs: validateSlabs(city.weightSlabs),
        isActive: city.isActive !== false
      };
    });
  }

  return repository.update(id, data);
}

async function deleteCountry(id) {
  const country = await getById(id);
  return repository.remove(country._id);
}

function findMatchingSlab(slabs, totalWeightGrams) {
  return slabs.find(slab => {
    const min = Number(slab.minWeightGrams);
    const max = Number(slab.maxWeightGrams);

    return totalWeightGrams > min && totalWeightGrams <= max;
  });
}

async function calculateCartWeight(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createError("Cart items are required to calculate shipping");
  }

  const merged = new Map();

  for (const item of items) {
    const productId = String(item.productId || "");
    const variantId = String(item.variantId || "");
    const sizeOptionId = String(item.sizeOptionId || "");
    const quantity = Number(item.quantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(variantId) ||
      !mongoose.isValidObjectId(sizeOptionId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      throw createError("Cart contains invalid product or quantity information");
    }

    const key = `${productId}:${variantId}:${sizeOptionId}`;
    const current = merged.get(key);

    if (current) {
      current.quantity += quantity;
    } else {
      merged.set(key, {
        productId,
        variantId,
        sizeOptionId,
        quantity
      });
    }
  }

  let totalWeightGrams = 0;

  for (const item of merged.values()) {
    if (item.quantity > 100) {
      throw createError("Maximum quantity per product size is 100");
    }

    const variant = await ProductVariant.findOne({
      _id: item.variantId,
      productId: item.productId,
      isActive: true
    }).select("sizes");

    if (!variant) {
      throw createError("A cart product variant is no longer available");
    }

    const size = variant.sizes.id(item.sizeOptionId);

    if (!size || !size.isActive) {
      throw createError("A selected product size is no longer available");
    }

    const weight = Number(size.weightGrams);

    if (!Number.isFinite(weight) || weight <= 0) {
      throw createError("A product is missing a valid weight");
    }

    totalWeightGrams += weight * item.quantity;
  }

  return {
    totalWeightGrams,
    items: [...merged.values()]
  };
}

async function getShippingQuote({ country, city, items }) {
  const countryConfig = await repository.findByCountry(country);

  if (!countryConfig) {
    throw createError("Shipping is not available for this country", 404);
  }

  const cart = await calculateCartWeight(items);

  const cityConfig = countryConfig.cityOverrides.find(
    entry =>
      entry.isActive &&
      normalize(entry.city) === normalize(city)
  );

  const selectedSlabs = cityConfig
    ? cityConfig.weightSlabs
    : countryConfig.weightSlabs;

  const matchedSlab = findMatchingSlab(
    selectedSlabs,
    cart.totalWeightGrams
  );

  if (!matchedSlab) {
    throw createError(
      `Shipping is not configured for a total weight of ${cart.totalWeightGrams}g`,
      422
    );
  }

  return {
    country: countryConfig.country,
    countryCode: countryConfig.countryCode,
    currency: countryConfig.currency,
    city: cityConfig?.city || null,
    rateType: cityConfig ? "city" : "country",
    totalWeightGrams: cart.totalWeightGrams,
    shippingSlab: {
      label: matchedSlab.label,
      minWeightGrams: matchedSlab.minWeightGrams,
      maxWeightGrams: matchedSlab.maxWeightGrams,
      rate: matchedSlab.rate
    },
    rate: Number(matchedSlab.rate)
  };
}

module.exports = {
  listAll,
  listActiveCountries,
  getById,
  createCountry,
  updateCountry,
  deleteCountry,
  calculateCartWeight,
  getShippingQuote
};
