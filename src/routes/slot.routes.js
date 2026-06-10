const express = require("express");
const router = express.Router();

const slotController = require("../controllers/slot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Slots
 *   description: Car parking slot management APIs
 */

/**
 * @swagger
 * /api/slots/{id}:
 *   get:
 *     summary: Get slot by id
 *     tags: [Slots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Slot loaded successfully
 *       404:
 *         description: Slot not found
 */
router.get("/:id", slotController.getSlotById);

/**
 * @swagger
 * /api/slots/{id}:
 *   patch:
 *     summary: Update slot
 *     tags: [Slots]
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
 *             $ref: '#/components/schemas/ParkingSlotUpdateRequest'
 *     responses:
 *       200:
 *         description: Slot updated successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Slot not found
 */
router.patch(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    slotController.updateSlot
);

/**
 * @swagger
 * /api/slots/{id}:
 *   delete:
 *     summary: Delete slot
 *     tags: [Slots]
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
 *         description: Slot deleted successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Slot not found
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    slotController.deleteSlot
);

module.exports = router;
