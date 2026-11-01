
const express = require("express");
const controller = require("./checkout.controller");
const { requireCustomer } = require("../../middleware/auth");

const router = express.Router();

router.post("/preview", requireCustomer, controller.preview);
router.post("/create-order", requireCustomer, controller.createOrder);

module.exports = router;
