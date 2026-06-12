const express = require("express");
const router = express.Router();

const parkingSessionController = require("../controllers/parkingSession.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Parking Sessions
 *   description: Staff check-in/check-out and parking fee payment APIs
 */

/**
 * @swagger
 * /api/parking-sessions/check-in:
 *   post:
 *     summary: Staff checks a vehicle into the parking building
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParkingSessionCheckInRequest'
 *     responses:
 *       201:
 *         description: Vehicle checked in successfully
 *       400:
 *         description: Invalid request, full motorbike floor, or unavailable car slot
 *       403:
 *         description: Parking staff permission required
 */
router.post(
    "/check-in",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkIn
);

/**
 * @swagger
 * /api/parking-sessions/active:
 *   get:
 *     summary: Staff gets active parking sessions
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions loaded successfully
 *       403:
 *         description: Parking staff permission required
 */
router.get(
    "/active",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.getActiveSessions
);

/**
 * @swagger
 * /api/parking-sessions/check-out-by-qr:
 *   post:
 *     summary: Staff checks a vehicle out by scanned QR code
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/QrValidateRequest'
 *               - $ref: '#/components/schemas/ParkingSessionCheckOutRequest'
 *     responses:
 *       200:
 *         description: Session checked out by QR
 *       404:
 *         description: Active session not found for QR
 */
router.post(
    "/check-out-by-qr",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkOutByQr
);

/**
 * @swagger
 * /api/parking-sessions/{id}:
 *   get:
 *     summary: Staff gets parking session by id
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session loaded successfully
 *       403:
 *         description: Parking staff permission required
 *       404:
 *         description: Session not found
 */
router.get(
    "/:id",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.getSessionById
);

/**
 * @swagger
 * /api/parking-sessions/{id}/check-out:
 *   post:
 *     summary: Staff checks a vehicle out and handles cash/card/VNPay/monthly pass payment
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParkingSessionCheckOutRequest'
 *     responses:
 *       200:
 *         description: Session checked out or VNPay payment URL created
 *       400:
 *         description: Invalid payment data
 *       403:
 *         description: Parking staff permission required
 *       404:
 *         description: Session not found
 */
router.post(
    "/:id/check-out",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkOut
);

module.exports = router;
