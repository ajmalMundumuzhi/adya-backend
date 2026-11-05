
const repository = require("./settings.repository");
const { inventoryThresholdSchema } = require("./settings.validation");

const INVENTORY_THRESHOLD_KEY = "inventory.lowStockThreshold";
const DEFAULT_INVENTORY_THRESHOLD = 5;

async function listSettings() {
  return repository.findAll();
}


async function getSetting(key) {
  if (key === INVENTORY_THRESHOLD_KEY) {
    const value = await getInventoryThreshold();

    return {
      key,
      value,
    };
  }

  const setting = await repository.findByKey(key);

  if (!setting) {
    return {
      key,
      value: null,
    };
  }

  return setting;
}


async function createSetting(data) {
  const existing = await repository.findByKey(data.key);

  if (existing) {
    const error = new Error("Setting already exists.");
    error.statusCode = 409;
    throw error;
  }

  if (data.key === INVENTORY_THRESHOLD_KEY) {
    validateInventoryThreshold(data.value);
  }

  return repository.create(data);
}

async function updateSetting(key, value) {
  if (!key || key.length > 150) {
    const error = new Error("Invalid setting key.");
    error.statusCode = 400;
    throw error;
  }

  if (key === INVENTORY_THRESHOLD_KEY) {
    validateInventoryThreshold(value);
  }

  return repository.updateByKey(key, value);
}

async function deleteSetting(key) {
  const setting = await repository.removeByKey(key);

  if (!setting) {
    const error = new Error("Setting not found.");
    error.statusCode = 404;
    throw error;
  }

  return setting;
}

async function getInventoryThreshold() {
  const setting = await repository.findByKey(
    INVENTORY_THRESHOLD_KEY
  );

  if (!setting) {
    return DEFAULT_INVENTORY_THRESHOLD;
  }

  try {
    validateInventoryThreshold(setting.value);
    return setting.value;
  } catch {
    return DEFAULT_INVENTORY_THRESHOLD;
  }
}

function validateInventoryThreshold(value) {
  const result = inventoryThresholdSchema.safeParse(value);

  if (!result.success) {
    const error = new Error(
      result.error.issues[0].message
    );
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  listSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  getInventoryThreshold,
};
