const express = require("express");
const controller = require("./reviews.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/", (req, res, next) => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return requireAdmin(req, res, next);
  }
  return next();
}, controller.list);

router.get("/:id", (req, res, next) => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return requireAdmin(req, res, next);
  }
  return next();
}, controller.getById);

router.post("/", controller.create);
router.patch("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.remove);

module.exports = router;
