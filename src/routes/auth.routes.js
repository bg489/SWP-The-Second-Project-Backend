/**
 * @fileoverview Khai báo endpoint, middleware bảo vệ và tài liệu Swagger cho nhóm API auth.routes.
 *
 * Luồng chính: HTTP request -> middleware xác thực/phân quyền -> controller phù hợp.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/auth.routes.js.
 */
const express = require("express");
/**
 * Khai báo `router` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/routes/auth.routes.js.
 */
const router = express.Router();

/**
 * Khai báo `authController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/auth.routes.js.
 */
const authController = require("../controllers/auth.controller");
/**
 * Khai báo `authMiddleware` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/routes/auth.routes.js.
 */
const authMiddleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Đăng ký tài khoản thành công
 *       400:
 *         description: Validation error or duplicated email/phone
 *       500:
 *         description: Server error
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/verify-registration:
 *   post:
 *     summary: Verify a newly registered account by email OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationVerificationRequest'
 *     responses:
 *       200:
 *         description: Email verified; the account can log in
 */
router.post("/verify-registration", authController.verifyRegistration);

router.post("/resend-registration-otp", authController.resendRegistrationOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login by email or phone
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Sai email/phone hoặc password
 *       500:
 *         description: Server error
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Sign in or register with a Google ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLoginRequest'
 *     responses:
 *       200:
 *         description: Google sign-in completed
 */
router.post("/google", authController.googleLogin);

router.post("/forgot-password", authController.requestPasswordReset);

router.post("/verify-reset", authController.verifyPasswordReset);

router.post("/reset-password", authController.resetPassword);

router.post(
    "/google/complete-onboarding",
    authMiddleware.allowIncompleteOnboarding,
    authController.completeGoogleOnboarding
);

router.post(
    "/refresh",
    authMiddleware.allowIncompleteOnboarding,
    authController.refresh
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin user hiện tại thành công
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 */
router.get(
    "/me",
    authMiddleware.allowIncompleteOnboarding,
    authController.getCurrentUser
);

module.exports = router;
