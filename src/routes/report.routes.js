const express = require("express");
const router = express.Router();

const reportController = require("../controllers/report.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: MVP parking operations and revenue reports
 */

/**
 * @swagger
 * /api/reports/traffic:
 *   get:
 *     summary: Vehicle entry/exit count by date, hour, type, and customer type
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           example: "2026-06-01 00:00:00"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           example: "2026-06-30 23:59:59"
 *     responses:
 *       200:
 *         description: Traffic report loaded successfully
 */
router.get(
    "/traffic",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getTrafficReport
);

/**
 * @swagger
 * /api/reports/motorbike-capacity:
 *   get:
 *     summary: Motorbike current count and remaining capacity report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Motorbike capacity report loaded successfully
 */
router.get(
    "/motorbike-capacity",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getMotorbikeCapacityReport
);

/**
 * @swagger
 * /api/reports/car-slots:
 *   get:
 *     summary: Car slot status summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car slot status report loaded successfully
 */
router.get(
    "/car-slots",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getCarSlotStatusReport
);

/**
 * @swagger
 * /api/reports/revenue:
 *   get:
 *     summary: Revenue report by payment/session source
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue report loaded successfully
 */
router.get(
    "/revenue",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getRevenueReport
);

/**
 * @swagger
 * /api/reports/qr-passes:
 *   get:
 *     summary: QR pass status and expiry report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR pass report loaded successfully
 */
router.get(
    "/qr-passes",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getQrPassReport
);

/**
 * @swagger
 * /api/reports/violations:
 *   get:
 *     summary: Violation count and fine summary report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Violation report loaded successfully
 */
router.get(
    "/violations",
    authMiddleware,
    parkingManagerMiddleware,
    reportController.getViolationReport
);

module.exports = router;
