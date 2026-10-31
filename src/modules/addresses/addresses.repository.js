const Address = require("../../models/Address");

function findByUser(userId) {
  return Address.find({ userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
}

function findByIdAndUser(id, userId) {
  return Address.findOne({ _id: id, userId });
}

function create(data) {
  return Address.create(data);
}

function update(id, userId, data) {
  return Address.findOneAndUpdate(
    { _id: id, userId },
    { $set: data },
    {
      new: true,
      runValidators: true,
    }
  );
}

function remove(id, userId) {
  return Address.findOneAndDelete({ _id: id, userId });
}

function unsetDefault(userId, excludeId = null) {
  const filter = { userId, isDefault: true };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Address.updateMany(
    filter,
    { $set: { isDefault: false } }
  );
}

function setDefault(id, userId) {
  return Address.findOneAndUpdate(
    { _id: id, userId },
    { $set: { isDefault: true } },
    { new: true, runValidators: true }
  );
}

function findFirst(userId) {
  return Address.findOne({ userId }).sort({ createdAt: 1 });
}

function findMostRecent(userId) {
  return Address.findOne({ userId }).sort({ createdAt: -1 });
}

module.exports = {
  findByUser,
  findByIdAndUser,
  create,
  update,
  remove,
  unsetDefault,
  setDefault,
  findFirst,
  findMostRecent,
};