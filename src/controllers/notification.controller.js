const notificationService = require("../services/notification.service");
const { successResponse, errorResponse } = require("../utils/response");

const getMyNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getMyNotifications(req.user.id);

        return successResponse(
            res,
            "Lay thong bao cua toi thanh cong",
            notifications
        );
    } catch (error) {
        return errorResponse(res, "Loi lay thong bao", 500, error.message);
    }
};

const getNotificationPreferences = async (req, res) => {
    try {
        const preferences = await notificationService.getNotificationPreferences(req.user.id);

        return successResponse(
            res,
            "Lấy tùy chọn thông báo thành công",
            preferences
        );
    } catch (error) {
        return errorResponse(res, "Lỗi lấy tùy chọn thông báo", 500, error.message);
    }
};

const updateNotificationPreferences = async (req, res) => {
    try {
        const preferences = await notificationService.updateNotificationPreferences({
            userId: req.user.id,
            emailNotificationsEnabled: Boolean(req.body.emailNotificationsEnabled),
        });

        return successResponse(
            res,
            "Đã cập nhật tùy chọn thông báo",
            preferences
        );
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật tùy chọn thông báo", 500, error.message);
    }
};

module.exports = {
    getMyNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
};
