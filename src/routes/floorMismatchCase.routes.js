const express = require("express");
const router = express.Router();

const floorMismatchCaseController = require("../controllers/floorMismatchCase.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.getFloorMismatchCases
);

router.post(
    "/report",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.reportFloorMismatch
);

router.post(
    "/:id/confirm",
    authMiddleware,
    parkingStaffMiddleware,
    floorMismatchCaseController.confirmFloorMismatch
);

module.exports = router;
