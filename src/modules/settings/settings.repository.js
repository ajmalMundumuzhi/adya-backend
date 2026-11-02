
const SiteSetting = require("../../models/SiteSetting");

console.log("SiteSetting model:", typeof SiteSetting.findOne);

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
    { $set: { value } },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
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
