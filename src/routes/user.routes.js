const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/role.middleware");

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
 * /api/users/{id}/role:
 *   patch:
 *     summary: Admin updates a user's account role
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UserRoleUpdateRequest'
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 */
router.patch(
    "/:id/role",
    authMiddleware,
    adminMiddleware,
    userController.updateUserRole
);

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
