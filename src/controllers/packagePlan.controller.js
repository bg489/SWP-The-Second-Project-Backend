const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
const packagePlanService = require("../services/packagePlan.service");
const monthlyPassService = require("../services/monthlyPass.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    PACKAGE_PLAN_STATUSES,
    VEHICLE_TYPES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

const parsePositiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatSqlDate = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const validatePayload = (body, existing = {}) => {
    const buildingId =
        body.buildingId === undefined
            ? existing.buildingId || null
            : body.buildingId
              ? Number(body.buildingId)
              : null;
    const name =
        body.name === undefined ? existing.name : String(body.name || "").trim();
    const vehicleType = normalizeEnum(body.vehicleType || existing.vehicleType);
    const price =
        body.price === undefined ? Number(existing.price) : parsePositiveInteger(body.price);
    const durationDays =
        body.durationDays === undefined
            ? Number(existing.durationDays)
            : parsePositiveInteger(body.durationDays);
    const status = normalizeEnum(body.status || existing.status || "ACTIVE");
    const description =
        body.description === undefined
            ? existing.description
            : String(body.description || "").trim();

    if (!name) {
        return { error: "name khong duoc de trong" };
    }

    if (!isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
        return { error: "vehicleType chi nhan MOTORBIKE hoac CAR" };
    }

    if (!price) {
        return { error: "price phai la so nguyen duong" };
    }

    if (!durationDays) {
        return { error: "durationDays phai la so nguyen duong" };
    }

    if (!isValidEnumValue(PACKAGE_PLAN_STATUSES, status)) {
        return { error: "status chi nhan ACTIVE hoac INACTIVE" };
    }

    return {
        value: {
            buildingId,
            description: description || null,
            durationDays,
            name,
            price,
            status,
            vehicleType,
        },
    };
};

const createPackagePlan = async (req, res) => {
    try {
        const validation = validatePayload(req.body);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const packagePlan = await packagePlanService.createPackagePlan(
            validation.value
        );

        return successResponse(res, "Tao goi thang thanh cong", packagePlan, 201);
    } catch (error) {
        return errorResponse(res, "Loi tao goi thang", 500, error.message);
    }
};

const getPackagePlans = async (req, res) => {
    try {
        const vehicleType = req.query.vehicleType
            ? normalizeEnum(req.query.vehicleType)
            : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const buildingId = req.query.buildingId ? Number(req.query.buildingId) : undefined;

        const packagePlans = await packagePlanService.getPackagePlans({
            buildingId,
            status,
            vehicleType,
        });

        return successResponse(res, "Lay danh sach goi thang thanh cong", packagePlans);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach goi thang", 500, error.message);
    }
};

const getPackagePlanById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Package plan id khong hop le", 400);
        }

        const packagePlan = await packagePlanService.getPackagePlanById(req.params.id);

        if (!packagePlan) {
            return errorResponse(res, "Khong tim thay goi thang", 404);
        }

        return successResponse(res, "Lay chi tiet goi thang thanh cong", packagePlan);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet goi thang", 500, error.message);
    }
};

const updatePackagePlan = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Package plan id khong hop le", 400);
        }

        const existing = await packagePlanService.getPackagePlanById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay goi thang", 404);
        }

        const validation = validatePayload(req.body, existing);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const packagePlan = await packagePlanService.updatePackagePlan({
            id: req.params.id,
            ...validation.value,
        });

        return successResponse(res, "Cap nhat goi thang thanh cong", packagePlan);
    } catch (error) {
        return errorResponse(res, "Loi cap nhat goi thang", 500, error.message);
    }
};

const deactivatePackagePlan = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Package plan id khong hop le", 400);
        }

        const existing = await packagePlanService.getPackagePlanById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay goi thang", 404);
        }

        await packagePlanService.deactivatePackagePlan(req.params.id);

        return successResponse(res, "Tat goi thang thanh cong", {
            id: Number(req.params.id),
        });
    } catch (error) {
        return errorResponse(res, "Loi tat goi thang", 500, error.message);
    }
};

const buyPackagePlan = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Package plan id khong hop le", 400);
        }

        const vehicleId = req.body.vehicleId;

        if (!isValidId(vehicleId)) {
            return errorResponse(res, "vehicleId khong hop le", 400);
        }

        const packagePlan = await packagePlanService.getPackagePlanById(req.params.id);

        if (!packagePlan || packagePlan.status !== "ACTIVE") {
            return errorResponse(res, "Khong tim thay goi thang dang mo ban", 404);
        }

        const vehicle = await packagePlanService.getVehicleForPackagePurchase({
            userId: req.user.id,
            vehicleId,
        });

        if (!vehicle) {
            return errorResponse(res, "Khong tim thay xe cua user", 404);
        }

        if (vehicle.status !== "APPROVED") {
            return errorResponse(res, "Xe phai duoc admin duyet truoc khi mua goi", 400);
        }

        if (vehicle.vehicleType !== packagePlan.vehicleType) {
            return errorResponse(res, "Goi thang khong khop loai xe", 400);
        }

        if (
            packagePlan.buildingId &&
            vehicle.buildingId &&
            Number(packagePlan.buildingId) !== Number(vehicle.buildingId)
        ) {
            return errorResponse(res, "Goi thang khong thuoc toa nha cua xe", 400);
        }

        if (vehicle.vehicleType === VEHICLE_TYPES.CAR) {
            return errorResponse(
                res,
                "Oto can dang ky slot cu the tai /api/slot-registrations voi packagePlanId",
                400
            );
        }

        const now = new Date();
        const startDate = formatSqlDate(now);
        const endDate = formatSqlDate(addDays(now, Number(packagePlan.durationDays)));
        const transactionRef = `PLAN${Date.now()}U${req.user.id}V${vehicleId}`;
        const orderInfo = `Thanh toan goi thang ${packagePlan.name} cho xe ${vehicle.plateNumber}`;
        const paymentUrl = createPaymentUrl({
            amount: Number(packagePlan.price),
            bankCode: req.body.bankCode,
            clientIp: getClientIp(req),
            locale: req.body.locale,
            orderInfo,
            transactionRef,
        });

        const result = await packagePlanService.createMotorbikePackagePurchase({
            buildingId: vehicle.buildingId,
            endDate,
            packagePlanId: packagePlan.id,
            paymentUrl,
            price: Number(packagePlan.price),
            startDate,
            transactionRef,
            userId: req.user.id,
            vehicleId,
        });

        const monthlyPass = await monthlyPassService.getMonthlyPassById(
            result.monthlyPassId
        );

        return successResponse(
            res,
            "Tao giao dich mua goi thang VNPay thanh cong",
            {
                monthlyPass,
                packagePlan,
                payment: {
                    id: result.paymentId,
                    transactionRef,
                    amount: Number(packagePlan.price),
                    provider: "VNPAY",
                    paymentUrl,
                },
            },
            201
        );
    } catch (error) {
        return errorResponse(res, "Loi mua goi thang", 500, error.message);
    }
};

module.exports = {
    buyPackagePlan,
    createPackagePlan,
    deactivatePackagePlan,
    getPackagePlanById,
    getPackagePlans,
    updatePackagePlan,
};
