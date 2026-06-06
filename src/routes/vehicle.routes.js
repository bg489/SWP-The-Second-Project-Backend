const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicle.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/role.middleware");

router.post("/", authMiddleware, vehicleController.createVehicle);

router.get("/my", authMiddleware, vehicleController.getMyVehicles);

router.get("/", authMiddleware, adminMiddleware, vehicleController.getAllVehicles);

router.patch(
    "/:id/approve",
    authMiddleware,
    adminMiddleware,
    vehicleController.approveVehicle
);

router.patch(
    "/:id/reject",
    authMiddleware,
    adminMiddleware,
    vehicleController.rejectVehicle
);

module.exports = router;