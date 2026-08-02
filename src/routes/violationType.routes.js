/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API violationType.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/violationType.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/violationType.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `violationTypeController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/violationType.routes.js.
 */
const violationTypeController = require("../controllers/violationType.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/violationType.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const {
    parkingManagerMiddleware,
    parkingStaffMiddleware,
} = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Violation Types
 *   description: Manager-managed violation type catalog
 */

/**
 * @swagger
 * /api/violation-types:
 *   get:
 *     summary: Staff/manager gets violation types
 *     tags: [Violation Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status. Staff screen should use ACTIVE.
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by violation type name
 *     responses:
 *       200:
 *         description: Violation types loaded successfully
 */
router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    violationTypeController.getViolationTypes
);

/**
 * @swagger
 * /api/violation-types:
 *   post:
 *     summary: Manager creates violation type
 *     tags: [Violation Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViolationTypeRequest'
 *     responses:
 *       201:
 *         description: Violation type created successfully
 *       403:
 *         description: Manager permission required
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    violationTypeController.createViolationType
);

/**
 * @swagger
 * /api/violation-types/{id}:
 *   get:
 *     summary: Staff/manager gets violation type detail
 *     tags: [Violation Types]
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
 *         description: Violation type loaded successfully
 */
router.get(
    "/:id",
    authMiddleware,
    parkingStaffMiddleware,
    violationTypeController.getViolationTypeById
);

/**
 * @swagger
 * /api/violation-types/{id}:
 *   put:
 *     summary: Manager updates violation type
 *     tags: [Violation Types]
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
 *             $ref: '#/components/schemas/ViolationTypeRequest'
 *     responses:
 *       200:
 *         description: Violation type updated successfully
 */
router.put(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    violationTypeController.updateViolationType
);

/**
 * @swagger
 * /api/violation-types/{id}:
 *   delete:
 *     summary: Manager deactivates violation type
 *     tags: [Violation Types]
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
 *         description: Violation type deactivated successfully
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    violationTypeController.deactivateViolationType
);

module.exports = router;
