/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API user.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/user.routes.js.
 */
const express = require("express");
const multer = require("multer");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/user.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `userController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/user.routes.js.
 */
const userController = require("../controllers/user.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/user.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");
const {
    adminMiddleware,
    parkingManagerMiddleware,
} = require("../middlewares/role.middleware");
const { errorResponse } = require("../utils/response");

const avatarImageUpload = multer({
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, callback) => {
        if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.mimetype)) {
            return callback(new Error("Vui lòng dùng ảnh JPEG, PNG, WebP hoặc HEIC."));
        }

        return callback(null, true);
    },
});

const avatarImageUploadMiddleware = (req, res, next) => {
    avatarImageUpload.single("avatar")(req, res, (error) => {
        if (!error) return next();

        const message = error.code === "LIMIT_FILE_SIZE"
            ? "Ảnh đại diện không được lớn hơn 8 MB."
            : error.message || "Không đọc được ảnh đại diện.";

        return errorResponse(res, message, 400);
    });
};

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User and role management APIs
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user loaded successfully
 *       401:
 *         description: Invalid or expired token
 */
router.get("/me", authMiddleware, userController.getCurrentUser);

router.patch("/me", authMiddleware, userController.updateMyProfile);

router.post("/me/update-request", authMiddleware, userController.requestMyProfileUpdate);

router.patch("/me/confirm-update", authMiddleware, userController.confirmMyProfileUpdate);

/**
 * @swagger
 * /api/users/me/avatar-upload:
 *   post:
 *     summary: Upload an avatar image and receive its public URL
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid image file
 */
router.post(
    "/me/avatar-upload",
    authMiddleware,
    avatarImageUploadMiddleware,
    userController.uploadMyAvatarImage
);

router.patch("/me/avatar", authMiddleware, userController.updateMyAvatar);

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Admin gets available business roles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles loaded successfully
 *       403:
 *         description: Admin permission required
 */
router.get(
    "/roles",
    authMiddleware,
    adminMiddleware,
    userController.getAvailableRoles
);

router.get(
    "/staff-candidates",
    authMiddleware,
    parkingManagerMiddleware,
    userController.getStaffCandidatesForMyBuilding
);

router.patch(
    "/staff/:id/building",
    authMiddleware,
    parkingManagerMiddleware,
    userController.assignStaffToMyBuilding
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Admin gets all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users loaded successfully
 *       403:
 *         description: Admin permission required
 */
router.get("/", authMiddleware, adminMiddleware, userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Admin gets user by id
 *     tags: [Users]
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
 *         description: User loaded successfully
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 */
router.get("/:id", authMiddleware, adminMiddleware, userController.getUserById);

module.exports = router;
