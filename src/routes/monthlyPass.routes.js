const express = require("express");
const router = express.Router();

const monthlyPassController = require("../controllers/monthlyPass.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingManagerMiddleware } = require("../middlewares/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Monthly Passes
 *   description: Parking manager creates and views monthly parking passes
 */

/**
 * @swagger
 * /api/monthly-passes:
 *   post:
 *     summary: Parking manager creates a monthly pass for an approved vehicle
 *     tags: [Monthly Passes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MonthlyPassRequest'
 *     responses:
 *       201:
 *         description: Monthly pass created successfully
 *       403:
 *         description: Parking manager permission required
 */
router.post(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    monthlyPassController.createMonthlyPass
);

/**
 * @swagger
 * /api/monthly-passes:
 *   get:
 *     summary: Parking manager gets monthly passes
 *     tags: [Monthly Passes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly passes loaded successfully
 *       403:
 *         description: Parking manager permission required
 */
router.get(
    "/",
    authMiddleware,
    parkingManagerMiddleware,
    monthlyPassController.getMonthlyPasses
);

/**
 * @swagger
 * /api/monthly-passes/{id}:
 *   get:
 *     summary: Parking manager gets monthly pass by id
 *     tags: [Monthly Passes]
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
 *         description: Monthly pass loaded successfully
 *       404:
 *         description: Monthly pass not found
 */
router.get(
    "/:id",
    authMiddleware,
    parkingManagerMiddleware,
    monthlyPassController.getMonthlyPassById
);

module.exports = router;
