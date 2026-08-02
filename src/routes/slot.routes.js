/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API slot.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slot.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/slot.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `slotController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slot.routes.js.
 */
const slotController = require("../controllers/slot.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/slot.routes.js.
 */
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
