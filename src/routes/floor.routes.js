const express = require("express");
const router = express.Router();

const floorController = require("../controllers/floor.controller");
const slotController = require("../controllers/slot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Floors
 *   description: Parking floor management APIs
 */

/**
 * @swagger
 * /api/floors/{floorId}/slots:
 *   post:
 *     summary: Create car slot under a car floor
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParkingSlotRequest'
 *     responses:
 *       201:
 *         description: Slot created successfully
 *       400:
 *         description: Invalid request or motorbike floor
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Floor not found
 */
router.post(
    "/:floorId/slots",
    authMiddleware,
    parkingManagerMiddleware,
    slotController.createSlot
);

/**
 * @swagger
 * /api/floors/{floorId}/slots:
 *   get:
 *     summary: Get slots under a car floor
 *     tags: [Slots]
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Slots loaded successfully
 *       400:
 *         description: Motorbike floor does not use slots
 *       404:
 *         description: Floor not found
 */
router.get("/:floorId/slots", slotController.getSlotsByFloorId);

/**
 * @swagger
 * /api/floors/{id}:
 *   get:
 *     summary: Get floor by id
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Floor loaded successfully
 *       404:
 *         description: Floor not found
 */
router.get("/:id", floorController.getFloorById);

/**
 * @swagger
 * /api/floors/{id}:
 *   patch:
 *     summary: Update floor
 *     tags: [Floors]
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
 *             $ref: '#/components/schemas/FloorUpdateRequest'
 *     responses:
 *       200:
 *         description: Floor updated successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Floor not found
 */
router.patch(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    floorController.updateFloor
);

/**
 * @swagger
 * /api/floors/{id}:
 *   delete:
 *     summary: Delete floor
 *     tags: [Floors]
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
 *         description: Floor deleted successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Floor not found
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    floorController.deleteFloor
);

module.exports = router;
