const mongoose = require("mongoose");
const repository = require("./addresses.repository");

function makeError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError(`Invalid ${label}`, 400);
  }
}

function validateAddress(data) {
  const requiredFields = [
    "fullName",
    "phone",
    "addressLine1",
    "city",
    "state",
    "postalCode",
    "country",
  ];

  for (const field of requiredFields) {
    if (
      typeof data[field] !== "string" ||
      !data[field].trim()
    ) {
      throw makeError(`${field} is required`, 400);
    }
  }

  if (
    data.addressType &&
    !["Home", "Work", "Other"].includes(data.addressType)
  ) {
    throw makeError("Invalid address type", 400);
  }
}

function getAddressData(data) {
  const fields = [
    "fullName",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "addressType",
  ];

  const result = {};

  for (const field of fields) {
    if (data[field] !== undefined) {
      result[field] =
        typeof data[field] === "string"
          ? data[field].trim()
          : data[field];
    }
  }

  return result;
}

async function getAddresses(userId) {
  return repository.findByUser(userId);
}

async function addAddress(userId, data) {
  validateAddress(data);

  const addressData = getAddressData(data);
  const existing = await repository.findByUser(userId);

  const shouldBeDefault =
    data.isDefault === true || existing.length === 0;

  if (shouldBeDefault) {
    await repository.unsetDefault(userId);
  }

  return repository.create({
    ...addressData,
    userId,
    isDefault: shouldBeDefault,
  });
}

async function updateAddress(userId, addressId, data) {
  validateId(addressId, "address ID");

  const existing = await repository.findByIdAndUser(
    addressId,
    userId
  );

  if (!existing) {
    throw makeError("Address not found", 404);
  }

  const addressData = getAddressData(data);

  const updatedData = {
    ...existing.toObject(),
    ...addressData,
  };

  validateAddress(updatedData);

  if (data.isDefault === true) {
    await repository.unsetDefault(userId, addressId);
    addressData.isDefault = true;
  } else if (data.isDefault === false && existing.isDefault) {
    addressData.isDefault = false;
  }

  const updated = await repository.update(
    addressId,
    userId,
    addressData
  );

  return updated;
}

async function deleteAddress(userId, addressId) {
  validateId(addressId, "address ID");

  const address = await repository.remove(addressId, userId);

  if (!address) {
    throw makeError("Address not found", 404);
  }

  if (address.isDefault) {
    const nextAddress = await repository.findMostRecent(userId);

    if (nextAddress) {
      await repository.unsetDefault(userId);
      await repository.setDefault(nextAddress._id, userId);
    }
  }

  return true;
}

async function setDefaultAddress(userId, addressId) {
  validateId(addressId, "address ID");

  const address = await repository.findByIdAndUser(
    addressId,
    userId
  );

  if (!address) {
    throw makeError("Address not found", 404);
  }

  await repository.unsetDefault(userId, addressId);

  return repository.setDefault(addressId, userId);
}

module.exports = {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};