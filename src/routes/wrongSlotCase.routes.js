const express = require("express");
const router = express.Router();

const wrongSlotCaseController = require("../controllers/wrongSlotCase.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { parkingStaffMiddleware } = require("../middlewares/role.middleware");

router.get(
    "/",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.getWrongSlotCases
);

router.post(
    "/report",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.reportWrongSlot
);

router.post(
    "/:id/confirm",
    authMiddleware,
    parkingStaffMiddleware,
    wrongSlotCaseController.confirmWrongSlot
);

module.exports = router;
