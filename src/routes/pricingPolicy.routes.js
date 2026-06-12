const express = require("express");
const router = express.Router();

const pricingPolicyController = require("../controllers/pricingPolicy.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Pricing Policies
 *   description: Parking manager configures turn/hourly parking fees
 */

/**
 * @swagger
 * /api/pricing-policies:
 *   get:
 *     summary: Get parking pricing policies
 *     tags: [Pricing Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [MOTORBIKE, CAR]
 *       - in: query
 *         name: pricingType
 *         schema:
 *           type: string
 *           enum: [TURN, HOURLY]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Pricing policies loaded successfully
 */
router.get("/", authMiddleware, pricingPolicyController.getPricingPolicies);

/**
 * @swagger
 * /api/pricing-policies:
 *   post:
 *     summary: Create parking pricing policy
 *     tags: [Pricing Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PricingPolicyRequest'
 *     responses:
 *       201:
 *         description: Pricing policy created successfully
 *       403:
 *         description: Parking manager permission required
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    pricingPolicyController.createPricingPolicy
);

/**
 * @swagger
 * /api/pricing-policies/{id}:
 *   get:
 *     summary: Get pricing policy detail
 *     tags: [Pricing Policies]
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
 *         description: Pricing policy loaded successfully
 */
router.get("/:id", authMiddleware, pricingPolicyController.getPricingPolicyById);

/**
 * @swagger
 * /api/pricing-policies/{id}:
 *   put:
 *     summary: Update pricing policy
 *     tags: [Pricing Policies]
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
 *             $ref: '#/components/schemas/PricingPolicyRequest'
 *     responses:
 *       200:
 *         description: Pricing policy updated successfully
 */
router.put(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    pricingPolicyController.updatePricingPolicy
);

/**
 * @swagger
 * /api/pricing-policies/{id}:
 *   delete:
 *     summary: Deactivate pricing policy
 *     tags: [Pricing Policies]
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
 *         description: Pricing policy deactivated successfully
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    pricingPolicyController.deactivatePricingPolicy
);

module.exports = router;
