const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/my", authMiddleware, notificationController.getMyNotifications);
router.patch(
    "/my/read-all",
    authMiddleware,
    notificationController.markAllNotificationsRead
);
router.patch(
    "/:id/read",
    authMiddleware,
    notificationController.markNotificationRead
);
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
