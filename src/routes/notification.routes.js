const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/my", authMiddleware, notificationController.getMyNotifications);

module.exports = router;
