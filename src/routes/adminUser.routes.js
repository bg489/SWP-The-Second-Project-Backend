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
 * /api/admin/users/{id}/building:
 *   patch:
 *     summary: Admin updates user's building
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     description: Admin đổi tòa nhà của user. Backend sẽ cập nhật users.building_id và có thể đồng bộ building_id cho vehicles của user đó.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *         description: ID của user cần đổi tòa nhà
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *             properties:
 *               buildingId:
 *                 type: integer
 *                 example: 2
 *                 description: ID của tòa nhà mới
 *     responses:
 *       200:
 *         description: Cập nhật tòa nhà của user thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cap nhat toa nha cua user thanh cong"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: "Nguyễn Văn A"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     phone:
 *                       type: string
 *                       example: "0901234567"
 *                     role:
 *                       type: string
 *                       example: "USER"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     buildingId:
 *                       type: integer
 *                       example: 2
 *                     buildingName:
 *                       type: string
 *                       example: "Sunrise Residence Parking"
 *                     buildingAddress:
 *                       type: string
 *                       example: "Quận 7, TP.HCM"
 *       400:
 *         description: User id hoặc buildingId không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       403:
 *         description: Chỉ ADMIN được đổi tòa nhà của user
 *       404:
 *         description: Không tìm thấy user hoặc tòa nhà
 *       500:
 *         description: Lỗi server
 */
router.patch(
    "/:id/building",
    authMiddleware,
    adminMiddleware,
    adminUserController.updateUserBuilding
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
