
const service = require("./shipping.service");
const {
  createShippingRateSchema,
  updateShippingRateSchema
} = require("./shipping.validation");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong"
  });
}

async function list(req, res) {
  try {
    const data = await service.listAll();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listCountries(req, res) {
  try {
    const data = await service.listActiveCountries();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getById(req, res) {
  try {
    const data = await service.getById(req.params.id);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function create(req, res) {
  try {
    const parsed = createShippingRateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping configuration",
        errors: parsed.error.flatten()
      });
    }

    const data = await service.createCountry(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Shipping country created successfully",
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function update(req, res) {
  try {
    const parsed = updateShippingRateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping configuration",
        errors: parsed.error.flatten()
      });
    }

    const data = await service.updateCountry(req.params.id, parsed.data);

    return res.status(200).json({
      success: true,
      message: "Shipping country updated successfully",
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteCountry(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Shipping country deleted successfully"
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function quote(req, res) {
  try {
    const { country, city, items } = req.body;

    if (!country || !city || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Country, city and cart items are required"
      });
    }

    const data = await service.getShippingQuote({
      country,
      city,
      items
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  list,
  listCountries,
  getById,
  create,
  update,
  remove,
  quote
};
