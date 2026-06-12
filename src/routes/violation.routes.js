const express = require("express");
const router = express.Router();

const violationController = require("../controllers/violation.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Violations
 *   description: Staff-recorded parking violations and fines
 */

/**
 * @swagger
 * /api/violations:
 *   get:
 *     summary: Staff gets parking violations
 *     tags: [Violations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, RESOLVED, COLLECTED, CANCELLED]
 *       - in: query
 *         name: plateNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [MOTORBIKE, CAR]
 *       - in: query
 *         name: parkingSessionId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Violations loaded successfully
 */
router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    violationController.getViolations
);

/**
 * @swagger
 * /api/violations:
 *   post:
 *     summary: Staff records a parking violation
 *     tags: [Violations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViolationRequest'
 *     responses:
 *       201:
 *         description: Violation recorded successfully
 */
router.post(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    violationController.createViolation
);

/**
 * @swagger
 * /api/violations/{id}:
 *   get:
 *     summary: Staff gets violation detail
 *     tags: [Violations]
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
 *         description: Violation loaded successfully
 */
router.get(
    "/:id",
    authMiddleware,
    parkingStaffMiddleware,
    violationController.getViolationById
);

/**
 * @swagger
 * /api/violations/{id}/status:
 *   patch:
 *     summary: Staff updates violation status
 *     tags: [Violations]
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
 *             $ref: '#/components/schemas/ViolationStatusRequest'
 *     responses:
 *       200:
 *         description: Violation status updated successfully
 */
router.patch(
    "/:id/status",
    authMiddleware,
    parkingStaffMiddleware,
    violationController.updateViolationStatus
);

module.exports = router;
