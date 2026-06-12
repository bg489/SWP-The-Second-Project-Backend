const express = require("express");
const router = express.Router();

const adminUserController = require("../controllers/adminUser.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Admin Users
 *   description: Admin user management APIs
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Admin lists/searches users
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by name, email or phone
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, MANAGER, STAFF, USER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, LOCKED, INACTIVE]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy danh sách user thành công
 *       403:
 *         description: Bạn không có quyền truy cập chức năng này
 */
router.get("/", authMiddleware, adminMiddleware, adminUserController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Admin gets user detail
 *     tags: [Admin Users]
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
 *         description: Lấy chi tiết user thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.get("/:id", authMiddleware, adminMiddleware, adminUserController.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}/role-status:
 *   patch:
 *     summary: Admin updates user role/status
 *     tags: [Admin Users]
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
 *             $ref: '#/components/schemas/UserStatusUpdateRequest'
 *     responses:
 *       200:
 *         description: Cập nhật role/trạng thái user thành công
 */
router.patch(
    "/:id/role-status",
    authMiddleware,
    adminMiddleware,
    adminUserController.updateUserRoleStatus
);

/**
 * @swagger
 * /api/admin/users/{id}/lock:
 *   patch:
 *     summary: Admin locks user account
 *     tags: [Admin Users]
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
 *         description: Khóa tài khoản user thành công
 */
router.patch("/:id/lock", authMiddleware, adminMiddleware, adminUserController.lockUser);

/**
 * @swagger
 * /api/admin/users/{id}/unlock:
 *   patch:
 *     summary: Admin unlocks user account
 *     tags: [Admin Users]
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
 *         description: Mở khóa tài khoản user thành công
 */
router.patch("/:id/unlock", authMiddleware, adminMiddleware, adminUserController.unlockUser);

module.exports = router;
