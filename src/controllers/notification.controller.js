/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của notification.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `notificationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/notification.controller.js.
 */
const notificationService = require("../services/notification.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Lấy nghiệp vụ `getMyNotifications` (get my notifications). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyNotifications
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getNotificationPreferences` (get notification preferences). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getNotificationPreferences
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateNotificationPreferences` (update notification preferences). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateNotificationPreferences
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `markNotificationRead` (mark notification read). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markNotificationRead
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `markAllNotificationsRead` (mark all notifications read). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markAllNotificationsRead
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
