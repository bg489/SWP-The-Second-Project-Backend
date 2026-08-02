/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của staffRoleRequest.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/staffRoleRequest.controller.js.
 */
const bcrypt = require("bcryptjs");

/**
 * Khai báo `staffRoleRequestService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/staffRoleRequest.controller.js.
 */
const staffRoleRequestService = require("../services/staffRoleRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    STAFF_ROLE_REQUEST_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");
const { isValidVietnamPhone, normalizeOptionalPhone } = require("../utils/phone");

/**
 * Khai báo `EMAIL_REGEX` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/controllers/staffRoleRequest.controller.js.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0;
};

/**
 * Kiểm tra nghiệp vụ `isValidPortrait` (is valid portrait). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidPortrait
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidPortrait = (value) => {
    if (typeof value !== "string" || value.length < 50 || value.length > 1_200_000) {
        return false;
    }

    return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
        || /^https:\/\//i.test(value);
};

/**
 * Lấy nghiệp vụ `getMyRequests` (get my requests). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyRequests
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyRequests = async (req, res) => {
    try {
        const buildingId = req.query.buildingId
            ? Number(req.query.buildingId)
            : undefined;

        if (buildingId && !isValidId(buildingId)) {
            return errorResponse(res, "Tòa nhà lọc không hợp lệ", 400);
        }

        const requests = await staffRoleRequestService.getManagerRequests({
            buildingId,
            managerId: req.user.id,
        });
        return successResponse(res, "Lấy lịch sử đề nghị tạo tài khoản Staff thành công", requests);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được lịch sử đề nghị tạo tài khoản Staff",
            error.statusCode || 500
        );
    }
};

/**
 * Tạo nghiệp vụ `createRequest` (create request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createRequest = async (req, res) => {
    try {
        const {
            buildingId,
            email,
            managerNote,
            name,
            password,
            phone,
            portraitImageUrl,
        } = req.body || {};
        const candidateName = String(name || "").trim();
        const candidateEmail = String(email || "").trim().toLowerCase();
        const candidatePhone = normalizeOptionalPhone(phone);
        const temporaryPassword = String(password || "");

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ", 400);
        }

        if (candidateName.length < 2 || candidateName.length > 100) {
            return errorResponse(res, "Họ tên nhân viên phải có từ 2 đến 100 ký tự", 400);
        }

        if (!EMAIL_REGEX.test(candidateEmail) || candidateEmail.length > 150) {
            return errorResponse(res, "Email nhân viên không hợp lệ", 400);
        }

        if (!isValidVietnamPhone(candidatePhone)) {
            return errorResponse(res, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0", 400);
        }

        if (temporaryPassword.length < 6 || temporaryPassword.length > 72) {
            return errorResponse(res, "Mật khẩu tạm thời phải có từ 6 đến 72 ký tự", 400);
        }

        if (!isValidPortrait(portraitImageUrl)) {
            return errorResponse(res, "Ảnh chân dung không hợp lệ hoặc có dung lượng quá lớn", 400);
        }

        if (managerNote && String(managerNote).trim().length > 1000) {
            return errorResponse(res, "Ghi chú không được dài quá 1000 ký tự", 400);
        }

        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const request = await staffRoleRequestService.createRequest({
            buildingId: Number(buildingId),
            candidateEmail,
            candidateName,
            candidatePhone,
            managerId: req.user.id,
            managerNote: String(managerNote || "").trim(),
            passwordHash,
            portraitImageUrl,
        });

        return successResponse(
            res,
            "Đã gửi hồ sơ đề nghị tạo tài khoản Staff độc lập",
            request,
            201
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Gửi hồ sơ đề nghị tạo tài khoản Staff thất bại",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getRequests` (get requests). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getRequests
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getRequests = async (req, res) => {
    try {
        const status = req.query.status
            ? normalizeEnum(req.query.status)
            : undefined;

        if (status && !isValidEnumValue(STAFF_ROLE_REQUEST_STATUSES, status)) {
            return errorResponse(res, "Trạng thái lọc không hợp lệ", 400);
        }

        const requests = await staffRoleRequestService.getAdminRequests({ status });
        return successResponse(res, "Lấy danh sách hồ sơ tạo tài khoản Staff thành công", requests);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được hồ sơ tạo tài khoản Staff",
            error.statusCode || 500
        );
    }
};

/**
 * Thực hiện nghiệp vụ `approveRequest` (approve request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function approveRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const approveRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Hồ sơ đề nghị không hợp lệ", 400);
        }

        const request = await staffRoleRequestService.approveRequest({
            id: Number(req.params.id),
            adminId: req.user.id,
            adminNote: String(req.body?.adminNote || "").trim().slice(0, 1000),
        });

        return successResponse(res, "Đã duyệt và tạo tài khoản Staff độc lập", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Duyệt hồ sơ tạo tài khoản Staff thất bại",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getStaffProfiles` (get staff profiles). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getStaffProfiles
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getStaffProfiles = async (req, res) => {
    try {
        const buildingId = Number(req.query.buildingId);

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ", 400);
        }

        const result = await staffRoleRequestService.getStaffProfiles({
            buildingId,
            managerId: req.user.id,
            q: String(req.query.q || "").trim().slice(0, 120),
        });

        return successResponse(res, "Lấy danh sách hồ sơ nhân viên thành công", result);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được danh sách hồ sơ nhân viên",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getStaffProfile` (get staff profile). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getStaffProfile
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getStaffProfile = async (req, res) => {
    try {
        if (!isValidId(req.params.userId)) {
            return errorResponse(res, "Nhân viên không hợp lệ", 400);
        }

        const profile = await staffRoleRequestService.getStaffProfileByUserId({
            userId: Number(req.params.userId),
        });

        if (!profile) {
            return errorResponse(res, "Không tìm thấy hồ sơ nhân viên đang hoạt động", 404);
        }

        return successResponse(res, "Lấy hồ sơ nhân viên thành công", profile);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được hồ sơ nhân viên",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getMyStaffProfile` (get my staff profile). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyStaffProfile
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyStaffProfile = async (req, res) => {
    try {
        const profile = await staffRoleRequestService.getStaffProfileByUserId({
            userId: req.user.id,
        });

        if (!profile) {
            return errorResponse(res, "Hồ sơ nhân viên của bạn chưa sẵn sàng", 404);
        }

        return successResponse(res, "Lấy hồ sơ nhân viên của tôi thành công", profile);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được hồ sơ nhân viên của bạn",
            error.statusCode || 500
        );
    }
};

/**
 * Thực hiện nghiệp vụ `rejectRequest` (reject request). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function rejectRequest
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const rejectRequest = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Hồ sơ đề nghị không hợp lệ", 400);
        }

        const adminNote = String(req.body?.adminNote || "").trim();

        if (!adminNote) {
            return errorResponse(res, "Vui lòng nhập lý do từ chối", 400);
        }

        const request = await staffRoleRequestService.rejectRequest({
            id: Number(req.params.id),
            adminId: req.user.id,
            adminNote: adminNote.slice(0, 1000),
        });

        return successResponse(res, "Đã từ chối hồ sơ tạo tài khoản Staff", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Từ chối hồ sơ tạo tài khoản Staff thất bại",
            error.statusCode || 500
        );
    }
};

module.exports = {
    approveRequest,
    createRequest,
    getMyStaffProfile,
    getMyRequests,
    getRequests,
    getStaffProfile,
    getStaffProfiles,
    rejectRequest,
};
