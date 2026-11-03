
const Banner = require("../../models/Banner");

function findAll(filter = {}) {
  return Banner.find(filter).sort({
    displayOrder: 1,
    createdAt: -1
  }).lean();
}

function findById(id) {
  return Banner.findById(id).lean();
}

function create(data) {
  return Banner.create(data);
}

function update(id, data) {
  return Banner.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true
  }).lean();
}

function deactivate(id) {
  return Banner.findByIdAndUpdate(
    id,
    { isActive: false },
    { returnDocument: "after", runValidators: true }
  ).lean();
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  deactivate
};
