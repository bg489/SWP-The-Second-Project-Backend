const express = require("express");
const router = express.Router();

const staffRoleRequestController = require("../controllers/staffRoleRequest.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware, requireRoles } = require("../middlewares/role.middleware");
const { ROLES } = require("../utils/constants");

/**
 * @swagger
 * tags:
 *   name: Staff Account Requests
 *   description: Manager requests for new independent Staff accounts and Admin approval
 */

/**
 * @swagger
 * /api/staff-role-requests/my:
 *   get:
 *     summary: Manager gets submitted Staff account requests
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Request history loaded
 */
router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.MANAGER),
    staffRoleRequestController.getMyRequests
);

/**
 * @swagger
 * /api/staff-role-requests:
 *   post:
 *     summary: Manager requests creation of a new independent Staff account
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, buildingId, portraitImageUrl]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               buildingId:
 *                 type: integer
 *               portraitImageUrl:
 *                 type: string
 *               managerNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff account request submitted
 *   get:
 *     summary: Admin gets Staff account requests
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Staff account requests loaded
 */
router.post(
    "/",
    authMiddleware,
    requireRoles(ROLES.MANAGER),
    staffRoleRequestController.createRequest
);

router.get(
    "/",
    authMiddleware,
    adminMiddleware,
    staffRoleRequestController.getRequests
);

/**
 * @swagger
 * /api/staff-role-requests/profiles:
 *   get:
 *     summary: Manager gets active Staff profiles in a selected building
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/profiles",
    authMiddleware,
    requireRoles(ROLES.MANAGER),
    staffRoleRequestController.getStaffProfiles
);

/**
 * @swagger
 * /api/staff-role-requests/profiles/me:
 *   get:
 *     summary: Staff gets their own employment profile
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/profiles/me",
    authMiddleware,
    requireRoles(ROLES.STAFF),
    staffRoleRequestController.getMyStaffProfile
);

/**
 * @swagger
 * /api/staff-role-requests/profiles/{userId}:
 *   get:
 *     summary: Manager gets one active Staff profile
 *     tags: [Staff Account Requests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/profiles/:userId",
    authMiddleware,
    requireRoles(ROLES.MANAGER),
    staffRoleRequestController.getStaffProfile
);

/**
 * @swagger
 * /api/staff-role-requests/{id}/approve:
 *   patch:
 *     summary: Admin approves and creates an independent Staff account
 *     tags: [Staff Account Requests]
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
 *         description: Staff account created
 */
router.patch(
    "/:id/approve",
    authMiddleware,
    adminMiddleware,
    staffRoleRequestController.approveRequest
);

/**
 * @swagger
 * /api/staff-role-requests/{id}/reject:
 *   patch:
 *     summary: Admin rejects a Staff account request
 *     tags: [Staff Account Requests]
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
 *         description: Request rejected
 */
router.patch(
    "/:id/reject",
    authMiddleware,
    adminMiddleware,
    staffRoleRequestController.rejectRequest
);

module.exports = router;
