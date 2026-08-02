/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API hourlySlotReservation.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/hourlySlotReservation.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/hourlySlotReservation.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `hourlySlotReservationController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/hourlySlotReservation.routes.js.
 */
const hourlySlotReservationController = require("../controllers/hourlySlotReservation.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/hourlySlotReservation.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const { AUTHENTICATED_ROLES, ROLES } = require("../constants/roles");

router.get(
    "/availability",
    authMiddleware,
    requireRoles(...AUTHENTICATED_ROLES),
    hourlySlotReservationController.getAvailability
);

router.get(
    "/check-in-match",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.getCheckInMatch
);

router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    hourlySlotReservationController.getMyReservations
);

router.post(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    hourlySlotReservationController.createUserReservation
);

router.get(
    "/staff",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.getStaffReservations
);

router.post(
    "/staff",
    authMiddleware,
    requireRoles(ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN),
    hourlySlotReservationController.createGuestReservation
);

module.exports = router;
