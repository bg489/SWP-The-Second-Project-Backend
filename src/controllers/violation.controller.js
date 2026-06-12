const parkingSessionService = require("../services/parkingSession.service");
const violationService = require("../services/violation.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    VEHICLE_TYPES,
    VIOLATION_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

const parseNonNegativeAmount = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const createViolation = async (req, res) => {
    try {
        const parkingSessionId = req.body.parkingSessionId;
        let session = null;

        if (parkingSessionId !== undefined && parkingSessionId !== null) {
            if (!isValidId(parkingSessionId)) {
                return errorResponse(res, "parkingSessionId khong hop le", 400);
            }

            session = await parkingSessionService.getSessionById(parkingSessionId);

            if (!session) {
                return errorResponse(res, "Khong tim thay phien gui xe", 404);
            }
        }

        const plateNumber = session
            ? session.plateNumber
            : typeof req.body.plateNumber === "string"
                ? req.body.plateNumber.trim().toUpperCase()
                : "";
        const vehicleType = session
            ? session.vehicleType
            : normalizeEnum(req.body.vehicleType);
        const violationType =
            typeof req.body.violationType === "string"
                ? req.body.violationType.trim()
                : "";
        const penaltyFee = parseNonNegativeAmount(req.body.penaltyFee);
        const status = req.body.status ? normalizeEnum(req.body.status) : "OPEN";

        if (!plateNumber) {
            return errorResponse(res, "plateNumber khong duoc de trong", 400);
        }

        if (!isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
            return errorResponse(res, "vehicleType chi nhan MOTORBIKE hoac CAR", 400);
        }

        if (!violationType) {
            return errorResponse(res, "violationType khong duoc de trong", 400);
        }

        if (penaltyFee === null) {
            return errorResponse(res, "penaltyFee phai la so nguyen khong am", 400);
        }

        if (!isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        const vehicle = session?.vehicleId
            ? null
            : await parkingSessionService.getVehicleByPlateNumber(plateNumber);

        const violation = await violationService.createViolation({
            detectedAt: req.body.detectedAt,
            evidenceUrl: req.body.evidenceUrl,
            note: req.body.note,
            parkingSessionId: session?.id || null,
            penaltyFee,
            plateNumber,
            staffId: req.user.id,
            status,
            vehicleId: session?.vehicleId || vehicle?.id || null,
            vehicleType,
            violationType,
        });

        return successResponse(res, "Ghi nhan vi pham thanh cong", violation, 201);
    } catch (error) {
        return errorResponse(res, "Loi ghi nhan vi pham", 500, error.message);
    }
};

const getViolations = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const vehicleType = req.query.vehicleType
            ? normalizeEnum(req.query.vehicleType)
            : undefined;
        const plateNumber =
            typeof req.query.plateNumber === "string"
                ? req.query.plateNumber.trim().toUpperCase()
                : undefined;
        const parkingSessionId = req.query.parkingSessionId;

        if (status && !isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        if (vehicleType && !isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
            return errorResponse(res, "vehicleType khong hop le", 400);
        }

        if (parkingSessionId && !isValidId(parkingSessionId)) {
            return errorResponse(res, "parkingSessionId khong hop le", 400);
        }

        const violations = await violationService.getViolations({
            from: req.query.from,
            parkingSessionId,
            plateNumber,
            status,
            to: req.query.to,
            vehicleType,
        });

        return successResponse(res, "Lay danh sach vi pham thanh cong", violations);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach vi pham", 500, error.message);
    }
};

const getViolationById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation id khong hop le", 400);
        }

        const violation = await violationService.getViolationById(req.params.id);

        if (!violation) {
            return errorResponse(res, "Khong tim thay vi pham", 404);
        }

        return successResponse(res, "Lay chi tiet vi pham thanh cong", violation);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet vi pham", 500, error.message);
    }
};

const updateViolationStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation id khong hop le", 400);
        }

        const status = normalizeEnum(req.body.status);

        if (!isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        const existing = await violationService.getViolationById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay vi pham", 404);
        }

        const violation = await violationService.updateViolationStatus({
            id: req.params.id,
            note: req.body.note,
            status,
        });

        return successResponse(res, "Cap nhat trang thai vi pham thanh cong", violation);
    } catch (error) {
        return errorResponse(
            res,
            "Loi cap nhat trang thai vi pham",
            500,
            error.message
        );
    }
};

module.exports = {
    createViolation,
    getViolationById,
    getViolations,
    updateViolationStatus,
};
