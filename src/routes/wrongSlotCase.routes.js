/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API wrongSlotCase.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/wrongSlotCase.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/wrongSlotCase.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `wrongSlotCaseController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/wrongSlotCase.routes.js.
 */
const wrongSlotCaseController = require("../controllers/wrongSlotCase.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/wrongSlotCase.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

router.get(
    "/my",
    authMiddleware,
    wrongSlotCaseController.getMyWrongSlotCases
);
router.post(
    "/my/:id/moved",
    authMiddleware,
    wrongSlotCaseController.markMyWrongSlotMoved
);

router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.getWrongSlotCases
);

router.post(
    "/report",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.reportWrongSlot
);

router.post(
    "/:id/moved",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.markWrongSlotMovedByStaff
);

router.post(
    "/:id/confirm",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.confirmWrongSlot
);

module.exports = router;
