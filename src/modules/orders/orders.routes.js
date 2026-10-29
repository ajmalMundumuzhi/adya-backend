
const express = require("express");
const controller = require("./orders.controller");
const {
  requireAdmin,
  requireCustomer,
  optionalCustomer
} = require("../../middleware/auth");

const router = express.Router();

router.post("/", optionalCustomer, controller.create);
router.get("/mine", requireCustomer, controller.listMine);
router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);
router.patch("/:id", requireAdmin, controller.update);

module.exports = router;