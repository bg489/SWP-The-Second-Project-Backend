/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API building.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/building.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/building.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `buildingController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/building.routes.js.
 */
const buildingController = require("../controllers/building.controller");
/**
 * Khai báo `floorController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/building.routes.js.
 */
const floorController = require("../controllers/floor.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/building.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Building management APIs
 */

/**
 * @swagger
 * /api/buildings:
 *   post:
 *     summary: Create building
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingRequest'
 *     responses:
 *       201:
 *         description: Building created successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Parking manager permission required
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    buildingController.createBuilding
);

/**
 * @swagger
 * /api/buildings:
 *   get:
 *     summary: Get all buildings with floor and slot counts
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Buildings loaded successfully
 */
router.get("/", buildingController.getAllBuildings);

/**
 * @swagger
 * /api/buildings/{buildingId}/floors:
 *   post:
 *     summary: Create floor under a building
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FloorRequest'
 *     responses:
 *       201:
 *         description: Floor created successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Building not found
 */
router.post(
    "/:buildingId/floors",
    authMiddleware,
    parkingManagerMiddleware,
    floorController.createFloor
);

/**
 * @swagger
 * /api/buildings/{buildingId}/floors:
 *   get:
 *     summary: Get floors under a building
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Floors loaded successfully
 *       404:
 *         description: Building not found
 */
router.get("/:buildingId/floors", floorController.getFloorsByBuildingId);

/**
 * @swagger
 * /api/buildings/{id}:
 *   get:
 *     summary: Get building by id
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Building loaded successfully
 *       404:
 *         description: Building not found
 */
router.get("/:id", buildingController.getBuildingById);

/**
 * @swagger
 * /api/buildings/{id}:
 *   patch:
 *     summary: Update building
 *     tags: [Buildings]
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
 *             $ref: '#/components/schemas/BuildingUpdateRequest'
 *     responses:
 *       200:
 *         description: Building updated successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Building not found
 */
router.patch(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    buildingController.updateBuilding
);

/**
 * @swagger
 * /api/buildings/{id}:
 *   delete:
 *     summary: Delete building
 *     tags: [Buildings]
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
 *         description: Building deleted successfully
 *       403:
 *         description: Parking manager permission required
 *       404:
 *         description: Building not found
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    buildingController.deleteBuilding
);

module.exports = router;
