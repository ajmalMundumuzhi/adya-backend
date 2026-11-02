const express = require("express");
const controller = require("./stripe.webhook.controller");

const router = express.Router();

router.post("/", controller.handleWebhook);

module.exports = router;