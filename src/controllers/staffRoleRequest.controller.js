const staffRoleRequestService = require("../services/staffRoleRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    STAFF_ROLE_REQUEST_STATUSES,
    STAFF_ROLE_REQUEST_TYPES,
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
        const buildingId = Number(req.query.buildingId);
        const requestType = normalizeEnum(
            req.query.requestType || STAFF_ROLE_REQUEST_TYPES.PROMOTE
        );

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ", 400);
        }

        if (!isValidEnumValue(STAFF_ROLE_REQUEST_TYPES, requestType)) {
            return errorResponse(res, "Loại đề nghị không hợp lệ", 400);
        }

        const result = await staffRoleRequestService.getManagerCandidates({
            buildingId,
            managerId: req.user.id,
            q: String(req.query.q || "").trim().slice(0, 120),
            requestType,
        });

        return successResponse(res, "Lấy danh sách tài khoản theo tòa thành công", result);
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
        const buildingId = req.query.buildingId
            ? Number(req.query.buildingId)
            : undefined;
        const requestType = req.query.requestType
            ? normalizeEnum(req.query.requestType)
            : undefined;

        if (buildingId && !isValidId(buildingId)) {
            return errorResponse(res, "Tòa nhà lọc không hợp lệ", 400);
        }

        if (requestType && !isValidEnumValue(STAFF_ROLE_REQUEST_TYPES, requestType)) {
            return errorResponse(res, "Loại đề nghị lọc không hợp lệ", 400);
        }

        const requests = await staffRoleRequestService.getManagerRequests({
            buildingId,
            managerId: req.user.id,
            requestType,
        });
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
        const {
            buildingId,
            managerNote,
            portraitImageUrl,
            requestType: rawRequestType,
            userId,
        } = req.body || {};
        const requestType = normalizeEnum(
            rawRequestType || STAFF_ROLE_REQUEST_TYPES.PROMOTE
        );

        if (!isValidId(userId)) {
            return errorResponse(res, "Vui lòng chọn một tài khoản hợp lệ", 400);
        }

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ", 400);
        }

        if (!isValidEnumValue(STAFF_ROLE_REQUEST_TYPES, requestType)) {
            return errorResponse(res, "Loại đề nghị không hợp lệ", 400);
        }

        if (
            requestType === STAFF_ROLE_REQUEST_TYPES.PROMOTE
            && !isValidPortrait(portraitImageUrl)
        ) {
            return errorResponse(res, "Ảnh chân dung không hợp lệ hoặc có dung lượng quá lớn", 400);
        }

        if (managerNote && String(managerNote).trim().length > 1000) {
            return errorResponse(res, "Ghi chú không được dài quá 1000 ký tự", 400);
        }

        const request = await staffRoleRequestService.createRequest({
            buildingId: Number(buildingId),
            managerId: req.user.id,
            userId: Number(userId),
            portraitImageUrl: requestType === STAFF_ROLE_REQUEST_TYPES.PROMOTE
                ? portraitImageUrl
                : null,
            managerNote: String(managerNote || "").trim(),
            requestType,
        });

        return successResponse(
            res,
            requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
                ? "Đã gửi đề nghị hủy quyền nhân viên"
                : "Đã gửi hồ sơ đề nghị cấp quyền nhân viên",
            request,
            201
        );
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
        const requestType = req.query.requestType
            ? normalizeEnum(req.query.requestType)
            : undefined;

        if (status && !isValidEnumValue(STAFF_ROLE_REQUEST_STATUSES, status)) {
            return errorResponse(res, "Trạng thái lọc không hợp lệ", 400);
        }

        if (requestType && !isValidEnumValue(STAFF_ROLE_REQUEST_TYPES, requestType)) {
            return errorResponse(res, "Loại đề nghị lọc không hợp lệ", 400);
        }

        const requests = await staffRoleRequestService.getAdminRequests({
            requestType,
            status,
        });
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

        return successResponse(
            res,
            request.requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
                ? "Đã chuyển nhân viên về quyền cư dân"
                : "Đã duyệt tài khoản thành nhân viên",
            request
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Duyệt hồ sơ đề nghị nhân viên thất bại",
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
    getMyStaffProfile,
    getMyRequests,
    getRequests,
    getStaffProfile,
    getStaffProfiles,
    rejectRequest,
};
