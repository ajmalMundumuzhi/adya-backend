const express = require("express");
const controller = require("./shipping.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/country", controller.getByCountry);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", requireAdmin, controller.create);
router.patch("/:id", requireAdmin, controller.update);
router.delete("/:id", requireAdmin, controller.remove);

module.exports = router;
