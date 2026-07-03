const floorMismatchCaseService = require("../services/floorMismatchCase.service");
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

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

const confirmFloorMismatch = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Floor mismatch case id khong hop le", 400);
        }

        const floorCase = await floorMismatchCaseService.confirmFloorMismatch({
            force: Boolean(req.body.force),
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

module.exports = {
    confirmFloorMismatch,
    getFloorMismatchCases,
    reportFloorMismatch,
};
