
const service = require("./currency.service");
const {
  currencyQuerySchema,
  conversionQuerySchema
} = require("./currency.validation");

function handleError(res, error) {
  const status =
    error.statusCode ||
    (error.name === "ZodError" ? 400 : 500);

  return res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Internal server error"
        : error.message
  });
}

async function getRates(req, res) {
  try {
    const { currency } = currencyQuerySchema.parse(req.query);

    const data = await service.getCurrencyRates(currency);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function convert(req, res) {
  try {
    const { currency, amount } =
      conversionQuerySchema.parse(req.query);

    const data = await service.convertAmount(
      amount,
      currency
    );

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function refresh(req, res) {
  try {
    const data = await service.refreshCurrencyRates();

    return res.json({
      success: true,
      message: "Currency rates refreshed successfully",
      data: {
        baseCurrency: "AUD",
        rates: data.rates,
        rateDate: data.rateDate,
        fetchedAt: data.fetchedAt
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getRates,
  convert,
  refresh
};
