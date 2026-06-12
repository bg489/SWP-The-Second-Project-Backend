const express = require("express");
const router = express.Router();

const packagePlanController = require("../controllers/packagePlan.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Package Plans
 *   description: Monthly package plan configuration and user purchase APIs
 */

/**
 * @swagger
 * /api/package-plans:
 *   get:
 *     summary: Get monthly package plans
 *     tags: [Package Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [MOTORBIKE, CAR]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Package plans loaded successfully
 */
router.get("/", authMiddleware, packagePlanController.getPackagePlans);

/**
 * @swagger
 * /api/package-plans:
 *   post:
 *     summary: Parking manager creates monthly package plan
 *     tags: [Package Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackagePlanRequest'
 *     responses:
 *       201:
 *         description: Package plan created successfully
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    packagePlanController.createPackagePlan
);

/**
 * @swagger
 * /api/package-plans/{id}/buy:
 *   post:
 *     summary: Registered user buys a motorbike monthly package via VNPay sandbox
 *     tags: [Package Plans]
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
 *             $ref: '#/components/schemas/BuyPackagePlanRequest'
 *     responses:
 *       201:
 *         description: VNPay payment URL created successfully
 */
router.post("/:id/buy", authMiddleware, packagePlanController.buyPackagePlan);

/**
 * @swagger
 * /api/package-plans/{id}:
 *   get:
 *     summary: Get monthly package plan detail
 *     tags: [Package Plans]
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
 *         description: Package plan loaded successfully
 */
router.get("/:id", authMiddleware, packagePlanController.getPackagePlanById);

/**
 * @swagger
 * /api/package-plans/{id}:
 *   put:
 *     summary: Parking manager updates monthly package plan
 *     tags: [Package Plans]
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
 *             $ref: '#/components/schemas/PackagePlanRequest'
 *     responses:
 *       200:
 *         description: Package plan updated successfully
 */
router.put(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    packagePlanController.updatePackagePlan
);

/**
 * @swagger
 * /api/package-plans/{id}:
 *   delete:
 *     summary: Parking manager deactivates monthly package plan
 *     tags: [Package Plans]
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
 *         description: Package plan deactivated successfully
 */
router.delete(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    packagePlanController.deactivatePackagePlan
);

module.exports = router;
