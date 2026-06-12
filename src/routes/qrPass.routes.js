const express = require("express");
const router = express.Router();

const qrPassController = require("../controllers/qrPass.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const {
    parkingManagerMiddleware,
    parkingStaffMiddleware,
} = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: QR Passes
 *   description: Digital monthly/slot QR pass APIs
 */

/**
 * @swagger
 * /api/qr-passes/my:
 *   get:
 *     summary: Registered user gets own QR passes
 *     tags: [QR Passes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User QR passes loaded successfully
 */
router.get("/my", authMiddleware, qrPassController.getMyQrPasses);

/**
 * @swagger
 * /api/qr-passes/validate:
 *   post:
 *     summary: Parking staff validates a scanned QR pass
 *     tags: [QR Passes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QrValidateRequest'
 *     responses:
 *       200:
 *         description: QR validation result
 */
router.post(
    "/validate",
    authMiddleware,
    parkingStaffMiddleware,
    qrPassController.validateQrPass
);

/**
 * @swagger
 * /api/qr-passes/monthly/{monthlyPassId}:
 *   post:
 *     summary: Create or refresh QR pass for an active monthly pass
 *     tags: [QR Passes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monthlyPassId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: QR pass created successfully
 */
router.post(
    "/monthly/:monthlyPassId",
    authMiddleware,
    qrPassController.createQrPassForMonthlyPass
);

/**
 * @swagger
 * /api/qr-passes/slot-registration/{slotRegistrationId}:
 *   post:
 *     summary: Create or refresh QR pass for a paid car slot registration
 *     tags: [QR Passes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotRegistrationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: QR pass created successfully
 */
router.post(
    "/slot-registration/:slotRegistrationId",
    authMiddleware,
    qrPassController.createQrPassForSlotRegistration
);

/**
 * @swagger
 * /api/qr-passes:
 *   get:
 *     summary: Parking staff or manager gets QR passes
 *     tags: [QR Passes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR passes loaded successfully
 */
router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    qrPassController.validateFilters,
    qrPassController.getQrPasses
);

/**
 * @swagger
 * /api/qr-passes/{id}:
 *   get:
 *     summary: Get QR pass detail
 *     tags: [QR Passes]
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
 *         description: QR pass loaded successfully
 */
router.get("/:id", authMiddleware, qrPassController.getQrPassById);

/**
 * @swagger
 * /api/qr-passes/{id}/status:
 *   patch:
 *     summary: Parking manager locks, unlocks, cancels, or expires a QR pass
 *     tags: [QR Passes]
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
 *             $ref: '#/components/schemas/QrPassStatusRequest'
 *     responses:
 *       200:
 *         description: QR pass status updated successfully
 */
router.patch(
    "/:id/status",
    authMiddleware,
    parkingManagerMiddleware,
    qrPassController.updateQrPassStatus
);

module.exports = router;
