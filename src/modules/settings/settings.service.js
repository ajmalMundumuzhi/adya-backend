const repository = require("./settings.repository");
const { inventoryThresholdSchema } = require("./settings.validation");

const INVENTORY_THRESHOLD_KEY = "inventory.lowStockThreshold";
const DEFAULT_INVENTORY_THRESHOLD = 5;

console.log("Inventory threshold schema:", typeof inventoryThresholdSchema);

function makeError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listSettings() {
  return repository.findAll();
}

async function getSetting(key) {
  if (key === INVENTORY_THRESHOLD_KEY) {
    const threshold = await getInventoryThreshold();

    return {
      key: INVENTORY_THRESHOLD_KEY,
      value: threshold
    };
  }

  const setting = await repository.findByKey(key);

  if (!setting) {
    throw makeError("Setting not found", 404);
  }

  return setting;
}

async function createSetting(data) {
  const existing = await repository.findByKey(data.key);

  if (existing) {
    throw makeError("Setting key already exists", 409);
  }

  if (data.key === INVENTORY_THRESHOLD_KEY) {
    const result = inventoryThresholdSchema.safeParse(data.value);

    if (!result.success) {
      throw makeError(result.error.issues[0].message, 400);
    }
  }

  return repository.create(data);
}

async function updateSetting(key, value) {
  if (!key || key.length > 150) {
    throw makeError("Invalid setting key", 400);
  }

  if (key === INVENTORY_THRESHOLD_KEY) {
    const result = inventoryThresholdSchema.safeParse(value);

    if (!result.success) {
      throw makeError(result.error.issues[0].message, 400);
    }
  }

  return repository.updateByKey(key, value);
}

async function deleteSetting(key) {
  const setting = await repository.findByKey(key);

  if (!setting) {
    throw makeError("Setting not found", 404);
  }

  await repository.removeByKey(key);
}

async function getInventoryThreshold() {
  const setting = await repository.findByKey(INVENTORY_THRESHOLD_KEY);

  if (!setting) {
    return DEFAULT_INVENTORY_THRESHOLD;
  }

  const result = inventoryThresholdSchema.safeParse(setting.value);

  if (!result.success) {
    return DEFAULT_INVENTORY_THRESHOLD;
  }

  return result.data;
}

module.exports = {
  listSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  getInventoryThreshold
};