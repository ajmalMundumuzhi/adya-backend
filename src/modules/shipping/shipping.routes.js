
const express = require("express");
const controller = require("./shipping.controller");
const {
  requireAdmin
} = require("../../middleware/auth");

const router = express.Router();

router.get("/countries", controller.listCountries);
router.post("/quote", controller.quote);

router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.post("/", requireAdmin, controller.create);
router.patch("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.remove);

module.exports = router;
