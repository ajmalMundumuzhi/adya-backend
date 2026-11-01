
const express = require("express");
const controller = require("./currency.controller");
const { requireAdmin } = require("../../middleware/auth");

const router = express.Router();

router.get("/rates", controller.getRates);
router.get("/convert", controller.convert);
router.post("/refresh", requireAdmin, controller.refresh);

module.exports = router;
