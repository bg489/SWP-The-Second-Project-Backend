/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của buildingChangeRequest.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `buildingChangeRequestService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/buildingChangeRequest.controller.js.
 */
const buildingChangeRequestService = require("../services/buildingChangeRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    BUILDING_CHANGE_REQUEST_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

/**
 * Tạo nghiệp vụ `createMyBuildingChangeRequest` (create my building change request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createMyBuildingChangeRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createMyBuildingChangeRequest = async (req, res) => {
    try {
        const { requestedBuildingId, reason } = req.body;

        if (!isValidId(requestedBuildingId)) {
            return errorResponse(res, "requestedBuildingId khong hop le", 400);
        }

        const request = await buildingChangeRequestService.createRequest({
            userId: req.user.id,
            requestedBuildingId: Number(requestedBuildingId),
            reason,
        });

        return successResponse(
            res,
            "Gui yeu cau doi toa nha thanh cong",
            request,
            201
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi gui yeu cau doi toa nha",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getMyBuildingChangeRequests` (get my building change requests). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyBuildingChangeRequests
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyBuildingChangeRequests = async (req, res) => {
    try {
        const requests = await buildingChangeRequestService.getMyRequests(
            req.user.id
        );

        return successResponse(
            res,
            "Lay danh sach yeu cau cua toi thanh cong",
            requests
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach yeu cau cua toi",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getBuildingChangeRequests` (get building change requests). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getBuildingChangeRequests
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingChangeRequests = async (req, res) => {
    try {
        const status = req.query.status
            ? normalizeEnum(req.query.status)
            : undefined;

        if (
            status &&
            !isValidEnumValue(BUILDING_CHANGE_REQUEST_STATUSES, status)
        ) {
            return errorResponse(res, "status khong hop le", 400, {
                allowedStatuses: Object.values(BUILDING_CHANGE_REQUEST_STATUSES),
            });
        }

        const userId = req.query.userId;

        if (userId && !isValidId(userId)) {
            return errorResponse(res, "userId khong hop le", 400);
        }

        const requests = await buildingChangeRequestService.getRequests({
            status,
            userId,
        });

        return successResponse(
            res,
            "Lay danh sach yeu cau doi toa nha thanh cong",
            requests
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach yeu cau doi toa nha",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `approveBuildingChangeRequest` (approve building change request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function approveBuildingChangeRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const approveBuildingChangeRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Request id khong hop le", 400);
        }

        const request = await buildingChangeRequestService.approveRequest({
            id: req.params.id,
            adminId: req.user.id,
            adminNote: req.body.adminNote,
        });

        return successResponse(res, "Duyet yeu cau doi toa nha thanh cong", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi duyet yeu cau doi toa nha",
            error.statusCode || 500
        );
    }
};

/**
 * Thực hiện nghiệp vụ `rejectBuildingChangeRequest` (reject building change request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function rejectBuildingChangeRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const rejectBuildingChangeRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Request id khong hop le", 400);
        }

        const request = await buildingChangeRequestService.rejectRequest({
            id: req.params.id,
            adminId: req.user.id,
            adminNote: req.body.adminNote,
        });

        return successResponse(res, "Tu choi yeu cau doi toa nha thanh cong", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi tu choi yeu cau doi toa nha",
            error.statusCode || 500
        );
    }
};

module.exports = {
    approveBuildingChangeRequest,
    createMyBuildingChangeRequest,
    getBuildingChangeRequests,
    getMyBuildingChangeRequests,
    rejectBuildingChangeRequest,
};