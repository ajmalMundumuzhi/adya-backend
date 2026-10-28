const service = require("./offers.service");
const { createOfferSchema, updateOfferSchema } = require("./offers.validation");

function handleError(res, error) {
  const status = error.statusCode ||
    (error.name === "ZodError" || error.name === "ValidationError" ? 400 :
    error.code === 11000 ? 409 : 500);

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function list(req, res) {
  try {
    const offers = await service.listOffers(req.query.all === "true" && req.admin?.role === "admin");
    return res.json({ success: true, data: offers });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    return res.json({ success: true, data: await service.getOffer(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const data = createOfferSchema.parse(req.body);
    const offer = await service.createOffer(data);
    return res.status(201).json({ success: true, data: offer });
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const data = updateOfferSchema.parse(req.body);
    const offer = await service.updateOffer(req.params.id, data);
    return res.json({ success: true, data: offer });
  } catch (error) {
    return handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await service.deleteOffer(req.params.id);
    return res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = { list, getById, create, update, remove };
