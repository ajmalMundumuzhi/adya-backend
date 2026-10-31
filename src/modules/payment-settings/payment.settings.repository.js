
const PaymentSetting = require("../../models/PaymentSettings");

async function findSettings() {
  return PaymentSetting.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
}

async function updateSettings(settings, data) {
  settings.set(data);
  return settings.save();
}

module.exports = {
  findSettings,
  updateSettings
};