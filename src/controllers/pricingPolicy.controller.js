const pricingPolicyService = require("../services/pricingPolicy.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    PACKAGE_PLAN_STATUSES,
    PRICING_TYPES,
    VEHICLE_TYPES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

const parsePositiveAmount = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const validatePayload = (body, existing = {}) => {
    const vehicleType = normalizeEnum(body.vehicleType || existing.vehicleType);
    const pricingType = normalizeEnum(body.pricingType || existing.pricingType);
    const amount =
        body.amount === undefined ? Number(existing.amount) : parsePositiveAmount(body.amount);
    const status = normalizeEnum(body.status || existing.status || "ACTIVE");
    const description =
        body.description === undefined ? existing.description : String(body.description || "").trim();

    if (!isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
        return { error: "vehicleType chi nhan MOTORBIKE hoac CAR" };
    }

    if (!isValidEnumValue(PRICING_TYPES, pricingType)) {
        return { error: "pricingType chi nhan TURN hoac HOURLY" };
    }

    if (vehicleType === VEHICLE_TYPES.MOTORBIKE && pricingType !== PRICING_TYPES.TURN) {
        return { error: "Xe may MVP chi tinh phi theo luot TURN" };
    }

    if (vehicleType === VEHICLE_TYPES.CAR && pricingType !== PRICING_TYPES.HOURLY) {
        return { error: "Oto MVP chi tinh phi theo gio HOURLY" };
    }

    if (!amount) {
        return { error: "amount phai la so nguyen duong" };
    }

    if (!isValidEnumValue(PACKAGE_PLAN_STATUSES, status)) {
        return { error: "status chi nhan ACTIVE hoac INACTIVE" };
    }

    return {
        value: {
            amount,
            description: description || null,
            pricingType,
            status,
            vehicleType,
        },
    };
};

const createPricingPolicy = async (req, res) => {
    try {
        const validation = validatePayload(req.body);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const pricingPolicy = await pricingPolicyService.createPricingPolicy(
            validation.value
        );

        return successResponse(res, "Tao cau hinh gia thanh cong", pricingPolicy, 201);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(
                res,
                "Da co cau hinh gia ACTIVE cho loai xe va cach tinh phi nay",
                400
            );
        }

        return errorResponse(res, "Loi tao cau hinh gia", 500, error.message);
    }
};

const getPricingPolicies = async (req, res) => {
    try {
        const vehicleType = req.query.vehicleType
            ? normalizeEnum(req.query.vehicleType)
            : undefined;
        const pricingType = req.query.pricingType
            ? normalizeEnum(req.query.pricingType)
            : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;

        const pricingPolicies = await pricingPolicyService.getPricingPolicies({
            pricingType,
            status,
            vehicleType,
        });

        return successResponse(
            res,
            "Lay danh sach cau hinh gia thanh cong",
            pricingPolicies
        );
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach cau hinh gia", 500, error.message);
    }
};

const getPricingPolicyById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Pricing policy id khong hop le", 400);
        }

        const pricingPolicy = await pricingPolicyService.getPricingPolicyById(
            req.params.id
        );

        if (!pricingPolicy) {
            return errorResponse(res, "Khong tim thay cau hinh gia", 404);
        }

        return successResponse(res, "Lay chi tiet cau hinh gia thanh cong", pricingPolicy);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet cau hinh gia", 500, error.message);
    }
};

const updatePricingPolicy = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Pricing policy id khong hop le", 400);
        }

        const existing = await pricingPolicyService.getPricingPolicyById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay cau hinh gia", 404);
        }

        const validation = validatePayload(req.body, existing);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const pricingPolicy = await pricingPolicyService.updatePricingPolicy({
            id: req.params.id,
            ...validation.value,
        });

        return successResponse(res, "Cap nhat cau hinh gia thanh cong", pricingPolicy);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(
                res,
                "Da co cau hinh gia ACTIVE cho loai xe va cach tinh phi nay",
                400
            );
        }

        return errorResponse(res, "Loi cap nhat cau hinh gia", 500, error.message);
    }
};

const deactivatePricingPolicy = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Pricing policy id khong hop le", 400);
        }

        const existing = await pricingPolicyService.getPricingPolicyById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay cau hinh gia", 404);
        }

        await pricingPolicyService.deactivatePricingPolicy(req.params.id);

        return successResponse(res, "Tat cau hinh gia thanh cong", {
            id: Number(req.params.id),
        });
    } catch (error) {
        return errorResponse(res, "Loi tat cau hinh gia", 500, error.message);
    }
};

module.exports = {
    createPricingPolicy,
    deactivatePricingPolicy,
    getPricingPolicies,
    getPricingPolicyById,
    updatePricingPolicy,
};
