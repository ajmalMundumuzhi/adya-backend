const repository = require("./products.repository");

async function list(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  const filter = { isActive: true };

  if (query.categoryId) filter.categoryId = query.categoryId;

  if (query.search) {
    filter.$text = { $search: String(query.search) };
  }

  const [products, total] = await Promise.all([
    repository.findAll(filter, (page - 1) * limit, limit),
    repository.count(filter)
  ]);

  return { products, page, limit, total, pages: Math.ceil(total / limit) };
}

async function getById(id) {
  return repository.findById(id);
}

async function create(data) {
  return repository.create(data);
}

async function update(id, data) {
  return repository.update(id, data);
}

async function deactivate(id) {
  return repository.deactivate(id);
}

module.exports = { list, getById, create, update, deactivate };
