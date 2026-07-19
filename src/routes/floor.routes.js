const express = require("express");
const router = express.Router();

const floorController = require("../controllers/floor.controller");
const slotController = require("../controllers/slot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const {
    managerOrAdminMiddleware,
    requireRoles,
} = require("../middlewares/role.middleware");
const { ROLES } = require("../utils/constants");

const floorReadMiddleware = requireRoles(
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.STAFF,
    ROLES.USER
);

/**
 * @swagger
 * tags:
 *   name: Floors
 *   description: Parking floor management APIs
 */

/**
 * @swagger
 * tags:
 *   name: Slots
 *   description: Parking slot management APIs
 */

/**
 * @swagger
 * /api/floors:
 *   post:
 *     summary: Create parking floor. Only ADMIN/MANAGER.
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - name
 *               - floorType
 *               - status
 *             properties:
 *               buildingId:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Tầng ô tô Test"
 *               floorType:
 *                 type: string
 *                 enum: [MOTORBIKE, CAR]
 *                 example: "CAR"
 *               capacity:
 *                 type: integer
 *                 example: 200
 *                 description: Required for MOTORBIKE floor
 *               slotCount:
 *                 type: integer
 *                 example: 5
 *                 description: Required for CAR floor
 *               slots:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["C-T01", "C-T02", "C-T03", "C-T04", "C-T05"]
 *                 description: Slot codes for CAR floor
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED, MAINTENANCE, INACTIVE]
 *                 example: "ACTIVE"
 *               operationNote:
 *                 type: string
 *                 example: "Tầng test dành cho ô tô"
 *     responses:
 *       201:
 *         description: Floor created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post("/", authMiddleware, managerOrAdminMiddleware, floorController.createFloor);

/**
 * @swagger
 * /api/floors:
 *   get:
 *     summary: Get parking floors. Residents only see active floors in their building.
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by floor name
 *       - in: query
 *         name: buildingId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by building id
 *       - in: query
 *         name: floorType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [MOTORBIKE, CAR]
 *         description: Filter by floor type
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, LOCKED, MAINTENANCE, INACTIVE]
 *         description: Filter by floor status
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Floors loaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, floorReadMiddleware, floorController.getFloors);

/**
 * @swagger
 * /api/floors/{floorId}/slots:
 *   post:
 *     summary: Create car slot under a car floor. Only ADMIN/MANAGER.
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của tầng gửi xe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotCode
 *             properties:
 *               slotCode:
 *                 type: string
 *                 example: "C-01"
 *               sizeLabel:
 *                 type: string
 *                 example: "STANDARD"
 *               positionDescription:
 *                 type: string
 *                 example: "Near gate"
 *               note:
 *                 type: string
 *                 example: "Slot test"
 *     responses:
 *       201:
 *         description: Slot created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post(
    "/:floorId/slots",
    authMiddleware,
    managerOrAdminMiddleware,
    slotController.createSlot
);

/**
 * @swagger
 * /api/floors/{floorId}/slots:
 *   get:
 *     summary: Get slots under a car floor. Residents only see slots in their building.
 *     tags: [Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của tầng gửi xe
 *     responses:
 *       200:
 *         description: Slots loaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
    "/:floorId/slots",
    authMiddleware,
    floorReadMiddleware,
    slotController.getSlotsByFloorId
);

/**
 * @swagger
 * /api/floors/{id}:
 *   get:
 *     summary: Get parking floor detail. Residents only see active floors in their building.
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của tầng gửi xe
 *     responses:
 *       200:
 *         description: Floor detail loaded successfully
 *       404:
 *         description: Floor not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, floorReadMiddleware, floorController.getFloorById);

/**
 * @swagger
 * /api/floors/{id}:
 *   patch:
 *     summary: Update parking floor. Only ADMIN/MANAGER.
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của tầng gửi xe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               buildingId:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Tầng ô tô Test Updated"
 *               floorType:
 *                 type: string
 *                 enum: [MOTORBIKE, CAR]
 *                 example: "CAR"
 *               capacity:
 *                 type: integer
 *                 example: 200
 *               slotCount:
 *                 type: integer
 *                 example: 6
 *               slots:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["C-T01", "C-T02", "C-T03", "C-T04", "C-T05", "C-T06"]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED, MAINTENANCE, INACTIVE]
 *                 example: "MAINTENANCE"
 *               operationNote:
 *                 type: string
 *                 example: "Đang bảo trì tầng test"
 *     responses:
 *       200:
 *         description: Floor updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Floor not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.patch("/:id", authMiddleware, managerOrAdminMiddleware, floorController.updateFloor);

/**
 * @swagger
 * /api/floors/{id}:
 *   delete:
 *     summary: Delete parking floor. Only ADMIN/MANAGER.
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của tầng gửi xe
 *     responses:
 *       200:
 *         description: Floor deleted successfully
 *       400:
 *         description: Cannot delete floor because it has used slots
 *       404:
 *         description: Floor not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, managerOrAdminMiddleware, floorController.deleteFloor);

module.exports = router;
