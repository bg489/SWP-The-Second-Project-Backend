const bcrypt = require("bcryptjs");

const staffRoleRequestService = require("../services/staffRoleRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    STAFF_ROLE_REQUEST_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");
const { isValidVietnamPhone, normalizeOptionalPhone } = require("../utils/phone");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0;
};

const isValidPortrait = (value) => {
    if (typeof value !== "string" || value.length < 50 || value.length > 1_200_000) {
        return false;
    }

    return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
        || /^https:\/\//i.test(value);
};

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
