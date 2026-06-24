const qrPassService = require("../services/qrPass.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    QR_PASS_STATUSES,
    QR_PASS_TYPES,
    ROLES,
    isValidEnumValue,
    normalizeEnum,
    normalizeRole,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

const hasElevatedRole = (role) => {
    const normalizedRole = normalizeRole(role);
    return [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF].includes(normalizedRole);
};

const getQrPasses = async (req, res) => {
    try {
        const passType = req.query.passType ? normalizeEnum(req.query.passType) : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const vehicleId = req.query.vehicleId;

        const qrPasses = await qrPassService.getQrPasses({
            passType,
            status,
            vehicleId: isValidId(vehicleId) ? vehicleId : undefined,
        });

        return successResponse(res, "Lay danh sach QR pass thanh cong", qrPasses);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach QR pass", 500, error.message);
    }
};

const getMyQrPasses = async (req, res) => {
    try {
        await qrPassService.ensureQrPassesForUser(req.user.id);

        const qrPasses = await qrPassService.getQrPasses({
            userId: req.user.id,
        });

        return successResponse(res, "Lay QR pass cua toi thanh cong", qrPasses);
    } catch (error) {
        return errorResponse(res, "Loi lay QR pass cua toi", 500, error.message);
    }
};

const getQrPassById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "QR pass id khong hop le", 400);
        }

        const qrPass = await qrPassService.getQrPassById(req.params.id);

        if (!qrPass) {
            return errorResponse(res, "Khong tim thay QR pass", 404);
        }

        if (!hasElevatedRole(req.user.role) && qrPass.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen xem QR pass nay", 403);
        }

        return successResponse(res, "Lay chi tiet QR pass thanh cong", qrPass);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet QR pass", 500, error.message);
    }
};

const createQrPassForMonthlyPass = async (req, res) => {
    try {
        if (!isValidId(req.params.monthlyPassId)) {
            return errorResponse(res, "monthlyPassId khong hop le", 400);
        }

        const monthlyPass = await qrPassService.getMonthlyPassForQr(
            req.params.monthlyPassId
        );

        if (!monthlyPass) {
            return errorResponse(res, "Khong tim thay the thang", 404);
        }

        if (!hasElevatedRole(req.user.role) && monthlyPass.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen tao QR cho the nay", 403);
        }

        const qrPass = await qrPassService.createQrPassForMonthlyPass({
            createdBy: req.user.id,
            monthlyPassId: req.params.monthlyPassId,
            note: req.body.note,
        });

        return successResponse(res, "Tao QR pass the thang thanh cong", qrPass, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi tao QR pass the thang",
            error.statusCode || 500,
            error.statusCode ? null : error.message
        );
    }
};

const createQrPassForSlotRegistration = async (req, res) => {
    try {
        if (!isValidId(req.params.slotRegistrationId)) {
            return errorResponse(res, "slotRegistrationId khong hop le", 400);
        }

        const registration = await qrPassService.getSlotRegistrationForQr(
            req.params.slotRegistrationId
        );

        if (!registration) {
            return errorResponse(res, "Khong tim thay dang ky slot", 404);
        }

        if (!hasElevatedRole(req.user.role) && registration.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen tao QR cho dang ky slot nay", 403);
        }

        const qrPass = await qrPassService.createQrPassForSlotRegistration({
            createdBy: req.user.id,
            note: req.body.note,
            slotRegistrationId: req.params.slotRegistrationId,
        });

        return successResponse(res, "Tao QR pass dang ky slot thanh cong", qrPass, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi tao QR pass dang ky slot",
            error.statusCode || 500,
            error.statusCode ? null : error.message
        );
    }
};

const validateQrPass = async (req, res) => {
    try {
        const qrCode =
            typeof req.body.qrCode === "string" ? req.body.qrCode.trim() : "";

        if (!qrCode) {
            return errorResponse(res, "qrCode khong duoc de trong", 400);
        }

        const result = await qrPassService.validateQrPass(qrCode);

        return successResponse(
            res,
            result.isValid ? "QR pass hop le" : "QR pass khong hop le",
            result
        );
    } catch (error) {
        return errorResponse(res, "Loi validate QR pass", 500, error.message);
    }
};

const updateQrPassStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "QR pass id khong hop le", 400);
        }

        const status = normalizeEnum(req.body.status);

        if (!isValidEnumValue(QR_PASS_STATUSES, status)) {
            return errorResponse(res, "status QR khong hop le", 400, {
                allowedStatuses: Object.values(QR_PASS_STATUSES),
            });
        }

        const existing = await qrPassService.getQrPassById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay QR pass", 404);
        }

        const qrPass = await qrPassService.updateQrPassStatus({
            id: req.params.id,
            note: req.body.note,
            status,
        });

        return successResponse(res, "Cap nhat trang thai QR pass thanh cong", qrPass);
    } catch (error) {
        return errorResponse(
            res,
            "Loi cap nhat trang thai QR pass",
            500,
            error.message
        );
    }
};

const validateFilters = (req, res, next) => {
    const passType = req.query.passType ? normalizeEnum(req.query.passType) : undefined;
    const status = req.query.status ? normalizeEnum(req.query.status) : undefined;

    if (passType && !isValidEnumValue(QR_PASS_TYPES, passType)) {
        return errorResponse(res, "passType QR khong hop le", 400, {
            allowedPassTypes: Object.values(QR_PASS_TYPES),
        });
    }

    if (status && !isValidEnumValue(QR_PASS_STATUSES, status)) {
        return errorResponse(res, "status QR khong hop le", 400, {
            allowedStatuses: Object.values(QR_PASS_STATUSES),
        });
    }

    return next();
};

module.exports = {
    createQrPassForMonthlyPass,
    createQrPassForSlotRegistration,
    getMyQrPasses,
    getQrPassById,
    getQrPasses,
    updateQrPassStatus,
    validateFilters,
    validateQrPass,
};
