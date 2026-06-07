const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User APIs
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
 *         description: Lấy thông tin user hiện tại thành công
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 */
router.get("/me", authMiddleware, userController.getCurrentUser);

module.exports = router;