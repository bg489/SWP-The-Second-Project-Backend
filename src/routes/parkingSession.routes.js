/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API parkingSession.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const express = require("express");
/**
 * Khai báo `multer` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const multer = require("multer");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `parkingSessionController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const parkingSessionController = require("../controllers/parkingSession.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");
const { errorResponse } = require("../utils/response");

/**
 * Khai báo `plateImageUpload` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/parkingSession.routes.js.
 */
const plateImageUpload = multer({
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    storage: multer.memoryStorage(),
    /**
     * Thực hiện nghiệp vụ `fileFilter` (file filter). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
     *
     * @function fileFilter
     * @param {*} _req - Giá trị `_req` được hàm sử dụng trong quá trình xử lý.
     * @param {*} file - Giá trị `file` được hàm sử dụng trong quá trình xử lý.
     * @param {*} callback - Giá trị `callback` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    fileFilter: (_req, file, callback) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            return callback(new Error("Vui lòng dùng ảnh JPEG, PNG hoặc WebP."));
        }

        return callback(null, true);
    },
});

/**
 * Thực hiện nghiệp vụ `plateImageUploadMiddleware` (plate image upload middleware). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function plateImageUploadMiddleware
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @param {*} next - Hàm chuyển quyền xử lý sang middleware kế tiếp.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const plateImageUploadMiddleware = (req, res, next) => {
    /* Callback nội bộ của biểu thức hiện tại; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    plateImageUpload.single("image")(req, res, (error) => {
        if (error) {
            return errorResponse(
                res,
                error.message || "Ảnh biển số không hợp lệ.",
                400
            );
        }

        return next();
    });
};

/**
 * @swagger
 * tags:
 *   name: Parking Sessions
 *   description: Staff check-in/check-out and parking fee payment APIs
 */

/**
 * @swagger
 * /api/parking-sessions/check-in:
 *   post:
 *     summary: Staff checks a vehicle into the parking building
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParkingSessionCheckInRequest'
 *     responses:
 *       201:
 *         description: Vehicle checked in successfully
 *       400:
 *         description: Invalid request, full motorbike floor, or unavailable car slot
 *       403:
 *         description: Parking staff permission required
 */
router.post(
    "/check-in",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkIn
);

/**
 * @swagger
 * /api/parking-sessions/active:
 *   get:
 *     summary: Staff gets active parking sessions
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions loaded successfully
 *       403:
 *         description: Parking staff permission required
 */
router.get(
    "/active",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.getActiveSessions
);

/**
 * @swagger
 * /api/parking-sessions/daily-activity:
 *   get:
 *     summary: View daily parking traffic, current occupancy and vehicle owner details
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [MOTORBIKE, CAR]
 *       - in: query
 *         name: activity
 *         schema:
 *           type: string
 *           enum: [ALL, CURRENTLY_PARKED, ENTERED, EXITED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daily parking activity loaded successfully
 *       403:
 *         description: Staff can only view their assigned building
 */
router.get(
    "/daily-activity",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.getDailyActivity
);

/**
 * @swagger
 * /api/parking-sessions/recognize-plate:
 *   post:
 *     summary: Read a vehicle plate number from a camera frame with FastALPR
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Plate recognition completed
 *       400:
 *         description: Invalid image
 *       503:
 *         description: FastALPR is unavailable or still starting
 */
router.post(
    "/recognize-plate",
    authMiddleware,
    parkingStaffMiddleware,
    plateImageUploadMiddleware,
    parkingSessionController.recognizePlate
);

router.get(
    "/my-active",
    authMiddleware,
    parkingSessionController.getMyActiveSessions
);

/**
 * @swagger
 * /api/parking-sessions/check-out-by-qr:
 *   post:
 *     summary: Staff checks a vehicle out by scanned QR code
 *     tags: [Parking Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/QrValidateRequest'
 *               - $ref: '#/components/schemas/ParkingSessionCheckOutRequest'
 *     responses:
 *       200:
 *         description: Session checked out by QR
 *       404:
 *         description: Active session not found for QR
 */
router.post(
    "/check-out-by-qr",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkOutByQr
);

/**
 * @swagger
 * /api/parking-sessions/{id}:
 *   get:
 *     summary: Staff gets parking session by id
 *     tags: [Parking Sessions]
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
 *         description: Session loaded successfully
 *       403:
 *         description: Parking staff permission required
 *       404:
 *         description: Session not found
 */
router.get(
    "/:id",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.getSessionById
);

/**
 * @swagger
 * /api/parking-sessions/{id}/check-out:
 *   post:
 *     summary: Staff checks a vehicle out and handles cash/card/VNPay/monthly pass payment
 *     tags: [Parking Sessions]
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
 *             $ref: '#/components/schemas/ParkingSessionCheckOutRequest'
 *     responses:
 *       200:
 *         description: Session checked out or VNPay payment URL created
 *       400:
 *         description: Invalid payment data
 *       403:
 *         description: Parking staff permission required
 *       404:
 *         description: Session not found
 */
router.post(
    "/:id/check-out",
    authMiddleware,
    parkingStaffMiddleware,
    parkingSessionController.checkOut
);

module.exports = router;
