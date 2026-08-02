/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của floorMismatchCase.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `floorMismatchCaseService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/floorMismatchCase.controller.js.
 */
const floorMismatchCaseService = require("../services/floorMismatchCase.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/floorMismatchCase.controller.js.
 */
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");

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
 * Lấy nghiệp vụ `getFloorMismatchCases` (get floor mismatch cases). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getFloorMismatchCases
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getFloorMismatchCases = async (req, res) => {
    try {
        const staffUser = await userService.getUserById(req.user.id);
        const cases = await floorMismatchCaseService.getCases({
            buildingId: staffUser?.buildingId || req.query.buildingId,
            status: req.query.status,
        });

        return successResponse(res, "Lay danh sach xe dau sai khu thanh cong", cases);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach xe dau sai khu",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `reportFloorMismatch` (report floor mismatch). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function reportFloorMismatch
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const reportFloorMismatch = async (req, res) => {
    try {
        const { observedFloorId, parkingSessionId, targetSlotId } = req.body;

        if (!isValidId(parkingSessionId)) {
            return errorResponse(res, "parkingSessionId khong hop le", 400);
        }

        if (!isValidId(observedFloorId)) {
            return errorResponse(res, "observedFloorId khong hop le", 400);
        }

        if (targetSlotId !== undefined && targetSlotId !== null && targetSlotId !== "") {
            if (!isValidId(targetSlotId)) {
                return errorResponse(res, "targetSlotId khong hop le", 400);
            }
        }

        const floorCase = await floorMismatchCaseService.reportFloorMismatch({
            evidenceUrl: req.body.evidenceUrl,
            note: req.body.note,
            observedFloorId: Number(observedFloorId),
            parkingSessionId: Number(parkingSessionId),
            staffId: req.user.id,
            targetSlotId: isValidId(targetSlotId) ? Number(targetSlotId) : null,
        });

        const message =
            floorCase.status === "LOCKED_AND_PENALIZED"
                ? "Da ghi nhan xe may vao sai khu, khoa xe va tinh phi vi pham"
                : "Da gui thong bao doi oto khoi khu xe may trong 15 phut";

        return successResponse(res, message, floorCase, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi ghi nhan xe dau sai khu",
            error.statusCode || 500
        );
    }
};

/**
 * Xử lý nghiệp vụ `confirmFloorMismatch` (confirm floor mismatch). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function confirmFloorMismatch
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const confirmFloorMismatch = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Floor mismatch case id khong hop le", 400);
        }

        const floorCase = await floorMismatchCaseService.confirmFloorMismatch({
            id: Number(req.params.id),
            staffId: req.user.id,
        });

        return successResponse(
            res,
            "Da xac nhan qua han va tinh chi phi xu ly",
            floorCase
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi xac nhan xe dau sai khu",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getMyFloorMismatchCases` (get my floor mismatch cases). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyFloorMismatchCases
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyFloorMismatchCases = async (req, res) => {
    try {
        const cases = await floorMismatchCaseService.getCases({
            status: req.query.status,
            userId: req.user.id,
        });

        return successResponse(
            res,
            "Lấy danh sách xe đậu sai khu của bạn thành công",
            cases
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi lấy danh sách xe đậu sai khu của bạn",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `markMyFloorMismatchMoved` (mark my floor mismatch moved). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markMyFloorMismatchMoved
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markMyFloorMismatchMoved = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Yêu cầu đậu sai khu không hợp lệ", 400);
        }

        const floorCase = await floorMismatchCaseService.markFloorMismatchMoved({
            id: Number(req.params.id),
            userId: req.user.id,
        });

        return successResponse(
            res,
            "Đã xác nhận bạn đã dời xe đúng hạn",
            floorCase
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Lỗi xác nhận dời xe",
            error.statusCode || 500
        );
    }
};

/**
 * Thực hiện nghiệp vụ `markFloorMismatchMovedByStaff` (mark floor mismatch moved by staff). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markFloorMismatchMovedByStaff
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markFloorMismatchMovedByStaff = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Yêu cầu đậu sai khu không hợp lệ", 400);
        }

        if (req.user.role === "STAFF" && !req.user.buildingId) {
            return errorResponse(res, "Nhân viên chưa được phân công tòa nhà", 400);
        }

        const floorCase = await floorMismatchCaseService.markFloorMismatchMoved({
            id: Number(req.params.id),
            staffBuildingId:
                req.user.role === "STAFF" ? req.user.buildingId : null,
            staffId: req.user.id,
        });

        return successResponse(
            res,
            "Đã xác nhận xe được dời đúng hạn và không phát sinh phí",
            floorCase
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Lỗi xác nhận xe đã dời",
            error.statusCode || 500
        );
    }
};

module.exports = {
    confirmFloorMismatch,
    getFloorMismatchCases,
    getMyFloorMismatchCases,
    markFloorMismatchMovedByStaff,
    markMyFloorMismatchMoved,
    reportFloorMismatch,
};
