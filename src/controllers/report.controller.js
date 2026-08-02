/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của report.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `reportService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/report.controller.js.
 */
const reportService = require("../services/report.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Lấy nghiệp vụ `getTrafficReport` (get traffic report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getTrafficReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTrafficReport = async (req, res) => {
    try {
        const report = await reportService.getTrafficReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao luot vao ra thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao luot vao ra", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMotorbikeCapacityReport` (get motorbike capacity report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMotorbikeCapacityReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMotorbikeCapacityReport = async (req, res) => {
    try {
        const report = await reportService.getMotorbikeCapacityReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao suc chua xe may thanh cong", report);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay bao cao suc chua xe may",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getCarSlotStatusReport` (get car slot status report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getCarSlotStatusReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getCarSlotStatusReport = async (req, res) => {
    try {
        const report = await reportService.getCarSlotStatusReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao slot oto thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao slot oto", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getRevenueReport` (get revenue report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getRevenueReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getRevenueReport = async (req, res) => {
    try {
        const report = await reportService.getRevenueReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao doanh thu thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao doanh thu", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getQrPassReport` (get qr pass report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getQrPassReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassReport = async (req, res) => {
    try {
        const report = await reportService.getQrPassReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao QR pass thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao QR pass", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getViolationReport` (get violation report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getViolationReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationReport = async (req, res) => {
    try {
        const report = await reportService.getViolationReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao vi pham thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao vi pham", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getFullReport` (get full report). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getFullReport
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getFullReport = async (req, res) => {
    try {
        const report = await reportService.getFullReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao tong hop thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao tong hop", 500, error.message);
    }
};

module.exports = {
    getCarSlotStatusReport,
    getFullReport,
    getMotorbikeCapacityReport,
    getQrPassReport,
    getRevenueReport,
    getTrafficReport,
    getViolationReport,
};
