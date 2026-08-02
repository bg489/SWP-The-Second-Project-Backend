/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API payment.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/payment.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/payment.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `paymentController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/payment.routes.js.
 */
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
