const express = require("express");
const controller = require("./orders.controller");
const {
  requireAdmin,
  requireCustomer,
  optionalCustomer
} = require("../../middleware/auth");

const router = express.Router();

router.post("/", requireCustomer, controller.create);

router.get("/mine", requireCustomer, controller.listMine);
router.get("/mine/:id", requireCustomer, controller.getMyOrder);

router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);

router.patch("/:id", requireAdmin, controller.update);

module.exports = router;