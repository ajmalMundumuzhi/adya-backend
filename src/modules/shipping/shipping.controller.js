const service = require("./shipping.service");

const {
  createShippingRateSchema,
  updateShippingRateSchema
} = require("./shipping.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (
      error.name === "ZodError" ||
      error.name === "ValidationError" ||
      error.name === "CastError"
        ? 400
        : error.code === 11000
          ? 409
          : 500
    );

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.listRates()
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.getRate(req.params.id)
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createShippingRateSchema.parse(req.body);
    const rate = await service.createRate(data);

    return res.status(201).json({
      success: true,
      data: rate
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateShippingRateSchema.parse(req.body);
    const rate = await service.updateRate(req.params.id, data);

    return res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteRate(req.params.id);

    return res.json({
      success: true,
      message: "Shipping rate deleted successfully"
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getByCountry(req, res) {
  try {
    const { country, city } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: "Country query parameter is required"
      });
    }

    if (city) {
      const rate = await service.getRateByCountryAndCity(country, city);

      return res.json({
        success: true,
        data: rate
      });
    }

    const rates = await service.getRatesByCountry(country);

    return res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getByCountry
};