/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của wrongSlotCase.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `wrongSlotCaseService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/wrongSlotCase.controller.js.
 */
const wrongSlotCaseService = require("../services/wrongSlotCase.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/wrongSlotCase.controller.js.
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
 * Thực hiện nghiệp vụ `reportWrongSlot` (report wrong slot). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function reportWrongSlot
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const reportWrongSlot = async (req, res) => {
    try {
        const { observedSlotId, parkingSessionId } = req.body;

        if (!isValidId(parkingSessionId)) {
            return errorResponse(res, "parkingSessionId khong hop le", 400);
        }

        if (!isValidId(observedSlotId)) {
            return errorResponse(res, "observedSlotId khong hop le", 400);
        }

        const wrongSlotCase = await wrongSlotCaseService.reportWrongSlot({
            evidenceUrl: req.body.evidenceUrl,
            note: req.body.note,
            observedSlotId: Number(observedSlotId),
            parkingSessionId: Number(parkingSessionId),
            staffId: req.user.id,
        });

        const message =
            wrongSlotCase.status === "ALLOWED"
                ? "Slot chua duoc dat truoc, da cho phep xe dau tai day va khong tinh phi vi pham"
                : "Slot da duoc dat truoc, da gui thong bao yeu cau doi xe trong 15 phut";

        return successResponse(res, message, wrongSlotCase, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi ghi nhan xe dau sai slot",
            error.statusCode || 500
        );
    }
};

/**
 * Xử lý nghiệp vụ `confirmWrongSlot` (confirm wrong slot). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function confirmWrongSlot
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const confirmWrongSlot = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Wrong slot case id khong hop le", 400);
        }

        const wrongSlotCase = await wrongSlotCaseService.confirmWrongSlot({
            id: Number(req.params.id),
            staffId: req.user.id,
        });

        return successResponse(
            res,
            "Da xac nhan xe khong doi cho va tinh phi vi pham",
            wrongSlotCase
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi xac nhan dau sai slot",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getWrongSlotCases` (get wrong slot cases). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getWrongSlotCases
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getWrongSlotCases = async (req, res) => {
    try {
        const staffUser = await userService.getUserById(req.user.id);
        const cases = await wrongSlotCaseService.getCases({
            buildingId: staffUser?.buildingId || req.query.buildingId,
            status: req.query.status,
        });

        return successResponse(res, "Lay danh sach xe dau sai slot thanh cong", cases);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach xe dau sai slot",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getMyWrongSlotCases` (get my wrong slot cases). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyWrongSlotCases
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyWrongSlotCases = async (req, res) => {
    try {
        const cases = await wrongSlotCaseService.getCases({
            status: req.query.status,
            userId: req.user.id,
        });

        return successResponse(
            res,
            "Lấy danh sách tình trạng ô đỗ của bạn thành công",
            cases
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi lấy tình trạng ô đỗ của bạn",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `markMyWrongSlotMoved` (mark my wrong slot moved). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markMyWrongSlotMoved
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markMyWrongSlotMoved = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Yêu cầu đậu sai ô không hợp lệ", 400);
        }

        const wrongSlotCase = await wrongSlotCaseService.markWrongSlotMoved({
            id: Number(req.params.id),
            userId: req.user.id,
        });

        return successResponse(
            res,
            "Đã xác nhận bạn đã dời xe đúng hạn",
            wrongSlotCase
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
 * Thực hiện nghiệp vụ `markWrongSlotMovedByStaff` (mark wrong slot moved by staff). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function markWrongSlotMovedByStaff
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markWrongSlotMovedByStaff = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Yêu cầu đậu sai ô không hợp lệ", 400);
        }

        if (req.user.role === "STAFF" && !req.user.buildingId) {
            return errorResponse(res, "Nhân viên chưa được phân công tòa nhà", 400);
        }

        const wrongSlotCase = await wrongSlotCaseService.markWrongSlotMoved({
            id: Number(req.params.id),
            staffBuildingId:
                req.user.role === "STAFF" ? req.user.buildingId : null,
            staffId: req.user.id,
        });

        return successResponse(
            res,
            "Đã xác nhận xe được dời đúng hạn và không phát sinh phí",
            wrongSlotCase
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
    confirmWrongSlot,
    getMyWrongSlotCases,
    getWrongSlotCases,
    markMyWrongSlotMoved,
    markWrongSlotMovedByStaff,
    reportWrongSlot,
};
