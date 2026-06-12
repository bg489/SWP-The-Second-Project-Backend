const express = require("express");
const router = express.Router();

const tempQrCardController = require("../controllers/tempQrCard.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const {
    parkingManagerMiddleware,
    parkingStaffMiddleware,
} = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Temporary QR Cards
 *   description: Reusable temporary QR/session cards for walk-in and by-session parking
 */

/**
 * @swagger
 * /api/temp-qr-cards:
 *   get:
 *     summary: Staff gets temporary QR cards
 *     tags: [Temporary QR Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [READY, IN_USE, COMPLETED, LOST, LOCKED]
 *     responses:
 *       200:
 *         description: Temporary QR cards loaded successfully
 */
router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    tempQrCardController.getTempQrCards
);

/**
 * @swagger
 * /api/temp-qr-cards:
 *   post:
 *     summary: Parking manager creates a temporary QR card
 *     tags: [Temporary QR Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TempQrCardRequest'
 *     responses:
 *       201:
 *         description: Temporary QR card created successfully
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    tempQrCardController.createTempQrCard
);

/**
 * @swagger
 * /api/temp-qr-cards/{id}:
 *   get:
 *     summary: Staff gets temporary QR card detail
 *     tags: [Temporary QR Cards]
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
 *         description: Temporary QR card loaded successfully
 */
router.get(
    "/:id",
    authMiddleware,
    parkingStaffMiddleware,
    tempQrCardController.getTempQrCardById
);

/**
 * @swagger
 * /api/temp-qr-cards/{id}/status:
 *   patch:
 *     summary: Manager or staff updates temporary QR card status
 *     tags: [Temporary QR Cards]
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
 *             $ref: '#/components/schemas/TempQrCardStatusRequest'
 *     responses:
 *       200:
 *         description: Temporary QR card status updated successfully
 */
router.patch(
    "/:id/status",
    authMiddleware,
    parkingStaffMiddleware,
    tempQrCardController.updateTempQrCardStatus
);

module.exports = router;
