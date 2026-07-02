const wrongSlotCaseService = require("../services/wrongSlotCase.service");
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

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

const confirmWrongSlot = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Wrong slot case id khong hop le", 400);
        }

        const wrongSlotCase = await wrongSlotCaseService.confirmWrongSlot({
            force: Boolean(req.body.force),
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

module.exports = {
    confirmWrongSlot,
    getWrongSlotCases,
    reportWrongSlot,
};
