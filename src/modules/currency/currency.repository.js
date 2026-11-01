
const CurrencyRate = require("../../models/CurrencyRate");

async function findRates() {
  return CurrencyRate.findOne({ key: "AUD" }).lean();
}

async function saveRates(data) {
  return CurrencyRate.findOneAndUpdate(
    { key: "AUD" },
    {
      $set: {
        baseCurrency: "AUD",
        rates: data.rates,
        rateDate: data.rateDate,
        fetchedAt: new Date(),
        provider: "Frankfurter"
      },
      $setOnInsert: {
        key: "AUD"
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  ).lean();
}

module.exports = {
  findRates,
  saveRates
};
