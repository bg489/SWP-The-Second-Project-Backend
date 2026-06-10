const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment.controller");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: VNPay sandbox payment callbacks
 */

/**
 * @swagger
 * /api/payments/vnpay-return:
 *   get:
 *     summary: VNPay browser return URL
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_TransactionStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_SecureHash
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment result handled
 *       400:
 *         description: Invalid checksum or amount
 */
router.get("/vnpay-return", paymentController.handleVnpayReturn);

/**
 * @swagger
 * /api/payments/vnpay-ipn:
 *   get:
 *     summary: VNPay IPN callback URL
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: VNPay-style RspCode response
 */
router.get("/vnpay-ipn", paymentController.handleVnpayIpn);

module.exports = router;
