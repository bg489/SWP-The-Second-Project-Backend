/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API floorMismatchCase.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/floorMismatchCase.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/floorMismatchCase.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `floorMismatchCaseController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/floorMismatchCase.routes.js.
 */
const floorMismatchCaseController = require("../controllers/floorMismatchCase.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/floorMismatchCase.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

router.get(
    "/my",
    authMiddleware,
    floorMismatchCaseController.getMyFloorMismatchCases
);
router.post(
    "/my/:id/moved",
    authMiddleware,
    floorMismatchCaseController.markMyFloorMismatchMoved
);

router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.getFloorMismatchCases
);

router.post(
    "/report",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.reportFloorMismatch
);

router.post(
    "/:id/moved",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.markFloorMismatchMovedByStaff
);

router.post(
    "/:id/confirm",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.confirmFloorMismatch
);

module.exports = router;
