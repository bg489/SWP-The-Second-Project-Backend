const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicle.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle registration and approval APIs
 */

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Register a vehicle for current user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleRequest'
 *     responses:
 *       201:
 *         description: Thêm xe thành công, đang chờ duyệt
 *       400:
 *         description: Validation error or duplicated plate number
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 */
router.post("/", authMiddleware, vehicleController.createVehicle);

/**
 * @swagger
 * /api/vehicles/my:
 *   get:
 *     summary: Get my registered vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách xe của tôi thành công
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 */
router.get("/my", authMiddleware, vehicleController.getMyVehicles);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Admin gets all vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách xe thành công
 *       403:
 *         description: Bạn không có quyền admin
 */
router.get("/", authMiddleware, adminMiddleware, vehicleController.getAllVehicles);

/**
 * @swagger
 * /api/vehicles/{id}/approve:
 *   patch:
 *     summary: Admin approves vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle id
 *     responses:
 *       200:
 *         description: Duyệt xe thành công
 *       404:
 *         description: Không tìm thấy xe
 *       403:
 *         description: Bạn không có quyền admin
 */
router.patch(
    "/:id/approve",
    authMiddleware,
    adminMiddleware,
    vehicleController.approveVehicle
);

/**
 * @swagger
 * /api/vehicles/{id}/reject:
 *   patch:
 *     summary: Admin rejects vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle id
 *     responses:
 *       200:
 *         description: Từ chối xe thành công
 *       404:
 *         description: Không tìm thấy xe
 *       403:
 *         description: Bạn không có quyền admin
 */
router.patch(
    "/:id/reject",
    authMiddleware,
    adminMiddleware,
    vehicleController.rejectVehicle
);

module.exports = router;