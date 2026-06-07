const express = require("express");
const router = express.Router();

const buildingController = require("../controllers/building.controller");

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Building management APIs
 */

/**
 * @swagger
 * /api/buildings:
 *   post:
 *     summary: Create building
 *     tags: [Buildings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildingRequest'
 *     responses:
 *       201:
 *         description: Tạo tòa nhà thành công
 *       400:
 *         description: Tên tòa nhà không được để trống
 */
router.post("/", buildingController.createBuilding);

/**
 * @swagger
 * /api/buildings:
 *   get:
 *     summary: Get all buildings
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Lấy danh sách tòa nhà thành công
 */
router.get("/", buildingController.getAllBuildings);

/**
 * @swagger
 * /api/buildings/{id}:
 *   get:
 *     summary: Get building by id
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Building id
 *     responses:
 *       200:
 *         description: Lấy chi tiết tòa nhà thành công
 *       404:
 *         description: Không tìm thấy tòa nhà
 */
router.get("/:id", buildingController.getBuildingById);

module.exports = router;