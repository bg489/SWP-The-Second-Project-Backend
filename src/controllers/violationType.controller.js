const violationTypeService = require("../services/violationType.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    VIOLATION_TYPE_STATUSES,
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

const validatePayload = (body, existing = {}) => {
    const name =
        body.name === undefined ? existing.name : String(body.name || "").trim();
    const defaultPenaltyFee =
        body.defaultPenaltyFee === undefined
            ? Number(existing.defaultPenaltyFee)
            : parseNonNegativeAmount(body.defaultPenaltyFee);
    const status = normalizeEnum(body.status || existing.status || "ACTIVE");
    const description =
        body.description === undefined
            ? existing.description
            : String(body.description || "").trim();

    if (!name) {
        return { error: "name khong duoc de trong" };
    }

    if (defaultPenaltyFee === null) {
        return { error: "defaultPenaltyFee phai la so nguyen khong am" };
    }

    if (!isValidEnumValue(VIOLATION_TYPE_STATUSES, status)) {
        return {
            error: "status loai vi pham chi nhan ACTIVE hoac INACTIVE",
        };
    }

    return {
        value: {
            defaultPenaltyFee,
            description: description || null,
            name,
            status,
        },
    };
};

const createViolationType = async (req, res) => {
    try {
        const validation = validatePayload(req.body);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const violationType = await violationTypeService.createViolationType({
            ...validation.value,
            createdBy: req.user.id,
        });

        return successResponse(
            res,
            "Tao loai vi pham thanh cong",
            violationType,
            201
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten loai vi pham da ton tai", 400);
        }

        return errorResponse(res, "Loi tao loai vi pham", 500, error.message);
    }
};

const getViolationTypes = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const q =
            typeof req.query.q === "string" ? req.query.q.trim() : undefined;

        if (status && !isValidEnumValue(VIOLATION_TYPE_STATUSES, status)) {
            return errorResponse(res, "status loai vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_TYPE_STATUSES),
            });
        }

        const violationTypes = await violationTypeService.getViolationTypes({
            q,
            status,
        });

        return successResponse(
            res,
            "Lay danh sach loai vi pham thanh cong",
            violationTypes
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach loai vi pham",
            500,
            error.message
        );
    }
};

const getViolationTypeById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const violationType = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!violationType) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        return successResponse(
            res,
            "Lay chi tiet loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay chi tiet loai vi pham",
            500,
            error.message
        );
    }
};

const updateViolationType = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const existing = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!existing) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        const validation = validatePayload(req.body, existing);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const violationType = await violationTypeService.updateViolationType({
            id: req.params.id,
            ...validation.value,
        });

        return successResponse(
            res,
            "Cap nhat loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten loai vi pham da ton tai", 400);
        }

        return errorResponse(
            res,
            "Loi cap nhat loai vi pham",
            500,
            error.message
        );
    }
};

const deactivateViolationType = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const existing = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!existing) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        const violationType = await violationTypeService.deactivateViolationType(
            req.params.id
        );

        return successResponse(
            res,
            "Tat loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi tat loai vi pham",
            500,
            error.message
        );
    }
};

module.exports = {
    createViolationType,
    deactivateViolationType,
    getViolationTypeById,
    getViolationTypes,
    updateViolationType,
};
