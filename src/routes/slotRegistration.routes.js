/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API slotRegistration.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slotRegistration.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/slotRegistration.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `slotRegistrationController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slotRegistration.routes.js.
 */
const slotRegistrationController = require("../controllers/slotRegistration.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slotRegistration.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const { ROLES } = require("../constants/roles");

/**
 * @swagger
 * tags:
 *   name: Slot Registrations
 *   description: Register approved cars into car slots and create VNPay sandbox payment
 */

/**
 * @swagger
 * /api/slot-registrations:
 *   post:
 *     summary: User registers an approved car into an available car slot and creates VNPay payment URL
 *     tags: [Slot Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SlotRegistrationRequest'
 *     responses:
 *       201:
 *         description: Slot registration and VNPay payment URL created successfully
 *       400:
 *         description: Invalid request, unapproved vehicle, non-car vehicle, or unavailable slot
 *       403:
 *         description: User role required
 */
router.post(
    "/",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.createSlotRegistration
);

/**
 * @swagger
 * /api/slot-registrations/my:
 *   get:
 *     summary: User gets my slot registrations
 *     tags: [Slot Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Slot registrations loaded successfully
 *       403:
 *         description: User role required
 */
router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.getMySlotRegistrations
);

/**
 * @swagger
 * /api/slot-registrations/{id}:
 *   get:
 *     summary: User gets my slot registration by id
 *     tags: [Slot Registrations]
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
 *         description: Slot registration loaded successfully
 *       403:
 *         description: User role required
 *       404:
 *         description: Slot registration not found
 */
router.get(
    "/:id",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.getMySlotRegistrationById
);

module.exports = router;
