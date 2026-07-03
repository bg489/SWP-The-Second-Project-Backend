const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/my", authMiddleware, notificationController.getMyNotifications);
router.get(
    "/preferences",
    authMiddleware,
    notificationController.getNotificationPreferences
);
router.patch(
    "/preferences",
    authMiddleware,
    notificationController.updateNotificationPreferences
);

module.exports = router;
