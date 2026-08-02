/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API notification.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/notification.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/notification.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `notificationController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/notification.routes.js.
 */
const notificationController = require("../controllers/notification.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/notification.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/my", authMiddleware, notificationController.getMyNotifications);
router.patch(
    "/my/read-all",
    authMiddleware,
    notificationController.markAllNotificationsRead
);
router.patch(
    "/:id/read",
    authMiddleware,
    notificationController.markNotificationRead
);
router.get(
    "/preferences",
    authMiddleware,
    notificationController.getNotificationPreferences
);
router.patch(
    "/preferences",
    authMiddleware,
    notificationController.updateNotificationPreferences
);

module.exports = router;
