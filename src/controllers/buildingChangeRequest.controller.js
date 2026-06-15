const buildingChangeRequestService = require("../services/buildingChangeRequest.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    BUILDING_CHANGE_REQUEST_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

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