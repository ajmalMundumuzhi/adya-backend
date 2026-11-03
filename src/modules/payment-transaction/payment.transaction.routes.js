
const express = require("express");
const controller = require("./payment.transactions.controller");
const { requireAdmin, requireCustomer } = require("../../middleware/auth");

const router = express.Router();

router.post("/checkout-session", requireCustomer, controller.createCheckoutSession);
router.post("/cancel-checkout", requireCustomer, controller.cancelCheckoutSession);
router.get("/session/:sessionId", requireCustomer, controller.getCustomerPaymentStatus);

router.get("/", requireAdmin, controller.list);
router.get("/:id", requireAdmin, controller.getById);

module.exports = router;
