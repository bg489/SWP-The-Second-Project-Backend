const staffRoleRequestService = require("../services/staffRoleRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    STAFF_ROLE_REQUEST_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

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

const getCandidates = async (req, res) => {
    try {
        const result = await staffRoleRequestService.getManagerCandidates({
            managerId: req.user.id,
            q: String(req.query.q || "").trim().slice(0, 120),
        });

        return successResponse(res, "Lấy danh sách tài khoản trong tòa thành công", result);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được danh sách tài khoản trong tòa",
            error.statusCode || 500
        );
    }
};

const getMyRequests = async (req, res) => {
    try {
        const requests = await staffRoleRequestService.getManagerRequests(req.user.id);
        return successResponse(res, "Lấy lịch sử đề nghị nhân viên thành công", requests);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được lịch sử đề nghị nhân viên",
            error.statusCode || 500
        );
    }
};

const createRequest = async (req, res) => {
    try {
        const { userId, portraitImageUrl, managerNote } = req.body || {};

        if (!isValidId(userId)) {
            return errorResponse(res, "Vui lòng chọn một tài khoản hợp lệ", 400);
        }

        if (!isValidPortrait(portraitImageUrl)) {
            return errorResponse(res, "Ảnh chân dung không hợp lệ hoặc có dung lượng quá lớn", 400);
        }

        if (managerNote && String(managerNote).trim().length > 1000) {
            return errorResponse(res, "Ghi chú không được dài quá 1000 ký tự", 400);
        }

        const request = await staffRoleRequestService.createRequest({
            managerId: req.user.id,
            userId: Number(userId),
            portraitImageUrl,
            managerNote: String(managerNote || "").trim(),
        });

        return successResponse(res, "Đã gửi hồ sơ đề nghị cấp quyền nhân viên", request, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Gửi hồ sơ đề nghị nhân viên thất bại",
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
        return successResponse(res, "Lấy danh sách hồ sơ đề nghị nhân viên thành công", requests);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không lấy được hồ sơ đề nghị nhân viên",
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

        return successResponse(res, "Đã duyệt tài khoản thành nhân viên", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Duyệt hồ sơ đề nghị nhân viên thất bại",
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

        return successResponse(res, "Đã từ chối hồ sơ đề nghị nhân viên", request);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Từ chối hồ sơ đề nghị nhân viên thất bại",
            error.statusCode || 500
        );
    }
};

module.exports = {
    approveRequest,
    createRequest,
    getCandidates,
    getMyRequests,
    getRequests,
    rejectRequest,
};
