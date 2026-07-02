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

module.exports = {
    getMyNotifications,
};
