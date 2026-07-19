const express = require("express");
const router = express.Router();

const staffRoleRequestController = require("../controllers/staffRoleRequest.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware, requireRoles } = require("../middlewares/role.middleware");
const { ROLES } = require("../utils/constants");

/**
 * @swagger
 * tags:
 *   name: Staff Role Requests
 *   description: Manager proposals, staff profiles and admin role approval
 */

/**
 * @swagger
 * /api/staff-role-requests/candidates:
 *   get:
 *     summary: Manager searches residents or staff in a selected building
 *     tags: [Staff Role Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [PROMOTE, DEMOTE]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate list loaded
 */
router.get(
    "/candidates",
    authMiddleware,
    requireRoles(ROLES.MANAGER),
    staffRoleRequestController.getCandidates
);

/**
 * @swagger
 * /api/staff-role-requests/my:
 *   get:
 *     summary: Manager gets submitted staff role requests
 *     tags: [Staff Role Requests]
 *     security:
 *       - bearerAuth: []
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
 *     summary: Manager submits a resident account for staff approval
 *     tags: [Staff Role Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, buildingId, requestType]
 *             properties:
 *               userId:
 *                 type: integer
 *               buildingId:
 *                 type: integer
 *               requestType:
 *                 type: string
 *                 enum: [PROMOTE, DEMOTE]
 *               portraitImageUrl:
 *                 type: string
 *               managerNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff role request submitted
 *   get:
 *     summary: Admin gets staff role requests
 *     tags: [Staff Role Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *       - in: query
 *         name: requestType
 *         schema:
 *           type: string
 *           enum: [PROMOTE, DEMOTE]
 *     responses:
 *       200:
 *         description: Staff role requests loaded
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
 *     summary: Manager gets active staff profiles in a selected building
 *     tags: [Staff Role Requests]
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
 *     tags: [Staff Role Requests]
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
 *     summary: Manager gets one active staff profile
 *     tags: [Staff Role Requests]
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
 *     summary: Admin approves a staff role request
 *     tags: [Staff Role Requests]
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
 *         description: Staff promotion or demotion request approved
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
 *     summary: Admin rejects a staff role request
 *     tags: [Staff Role Requests]
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
