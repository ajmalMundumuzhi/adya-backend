const mongoose = require("mongoose");
const repository = require("./categories.repository");

async function listCategories(includeInactive = false) {
  return repository.findAll(includeInactive ? {} : { isActive: true });
}

async function getCategory(id) {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const category = await repository.findById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
}

async function createCategory(data) {
  if (data.parentId) {
    if (!mongoose.isValidObjectId(data.parentId)) {
      const error = new Error("Invalid parent category ID");
      error.statusCode = 400;
      throw error;
    }

    const parent = await repository.findById(data.parentId);

    if (!parent || !parent.isActive) {
      const error = new Error("Active parent category not found");
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.slug) {
    const existing = await repository.findBySlug(data.slug);

    if (existing) {
      const error = new Error("Category slug already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  return repository.create(data);
}

async function updateCategory(id, data) {
  await getCategory(id);

  if (data.parentId) {
    if (!mongoose.isValidObjectId(data.parentId)) {
      const error = new Error("Invalid parent category ID");
      error.statusCode = 400;
      throw error;
    }

    if (data.parentId === id) {
      const error = new Error("A category cannot be its own parent");
      error.statusCode = 400;
      throw error;
    }

    const parent = await repository.findById(data.parentId);

    if (!parent) {
      const error = new Error("Parent category not found");
      error.statusCode = 404;
      throw error;
    }
  }

  if (data.slug) {
    const existing = await repository.findBySlug(data.slug);

    if (existing && existing._id.toString() !== id) {
      const error = new Error("Category slug already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  const category = await repository.update(id, data);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
}

async function deactivateCategory(id) {
  const category = await getCategory(id);

  const child = await repository.findAll({
    parentId: category._id,
    isActive: true
  });

  if (child.length) {
    const error = new Error("Deactivate child categories first");
    error.statusCode = 409;
    throw error;
  }

  return repository.deactivate(id);
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deactivateCategory
};