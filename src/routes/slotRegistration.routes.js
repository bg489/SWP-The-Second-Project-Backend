const express = require("express");
const router = express.Router();

const slotRegistrationController = require("../controllers/slotRegistration.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const { ROLES } = require("../constants/roles");

/**
 * @swagger
 * tags:
 *   name: Slot Registrations
 *   description: Register approved cars into car slots and create VNPay sandbox payment
 */

/**
 * @swagger
 * /api/slot-registrations:
 *   post:
 *     summary: User registers an approved car into an available car slot and creates VNPay payment URL
 *     tags: [Slot Registrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SlotRegistrationRequest'
 *     responses:
 *       201:
 *         description: Slot registration and VNPay payment URL created successfully
 *       400:
 *         description: Invalid request, unapproved vehicle, non-car vehicle, or unavailable slot
 *       403:
 *         description: User role required
 */
router.post(
    "/",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.createSlotRegistration
);

/**
 * @swagger
 * /api/slot-registrations/my:
 *   get:
 *     summary: User gets my slot registrations
 *     tags: [Slot Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Slot registrations loaded successfully
 *       403:
 *         description: User role required
 */
router.get(
    "/my",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.getMySlotRegistrations
);

/**
 * @swagger
 * /api/slot-registrations/{id}:
 *   get:
 *     summary: User gets my slot registration by id
 *     tags: [Slot Registrations]
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
 *         description: Slot registration loaded successfully
 *       403:
 *         description: User role required
 *       404:
 *         description: Slot registration not found
 */
router.get(
    "/:id",
    authMiddleware,
    requireRoles(ROLES.USER),
    slotRegistrationController.getMySlotRegistrationById
);

module.exports = router;
