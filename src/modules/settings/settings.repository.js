const SiteSetting = require("../../models/SiteSetting");

function findAll() {
  return SiteSetting.find().sort({ key: 1 });
}

function findByKey(key) {
  return SiteSetting.findOne({ key });
}

function findById(id) {
  return SiteSetting.findById(id);
}

function create(data) {
  return SiteSetting.create(data);
}

function updateByKey(key, value) {
  return SiteSetting.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function removeByKey(key) {
  return SiteSetting.findOneAndDelete({ key });
}

module.exports = {
  findAll,
  findByKey,
  findById,
  create,
  updateByKey,
  removeByKey
};
