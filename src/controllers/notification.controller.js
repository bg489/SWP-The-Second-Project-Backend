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

const markNotificationRead = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return errorResponse(res, "Thông báo không hợp lệ", 400);
        }

        const notification = await notificationService.markNotificationRead({
            id,
            userId: req.user.id,
        });

        if (!notification) {
            return errorResponse(res, "Không tìm thấy thông báo", 404);
        }

        return successResponse(res, "Đã đánh dấu thông báo là đã đọc", notification);
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật thông báo", 500, error.message);
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const result = await notificationService.markAllNotificationsRead(req.user.id);
        return successResponse(res, "Đã đọc tất cả thông báo", result);
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật thông báo", 500, error.message);
    }
};

module.exports = {
    getMyNotifications,
    getNotificationPreferences,
    markAllNotificationsRead,
    markNotificationRead,
    updateNotificationPreferences,
};
