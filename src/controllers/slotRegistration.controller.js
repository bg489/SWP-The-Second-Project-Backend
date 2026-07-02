const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
const packagePlanService = require("../services/packagePlan.service");
const slotRegistrationService = require("../services/slotRegistration.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const parsePositiveAmount = (amount) => {
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
        return null;
    }

    return parsedAmount;
};

const formatSqlDate = (date) => {
    return date.toISOString().slice(0, 10);
};

const isValidDateString = (date) => {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
};

const buildRegistrationDates = ({ durationDays = 30, startDate, endDate }) => {
    const now = new Date();
    const defaultStartDate = formatSqlDate(now);
    const defaultEndDate = formatSqlDate(
        new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
    );

    if (startDate && !isValidDateString(startDate)) {
        return {
            error: "startDate phai co dinh dang YYYY-MM-DD",
        };
    }

    if (endDate && !isValidDateString(endDate)) {
        return {
            error: "endDate phai co dinh dang YYYY-MM-DD",
        };
    }

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    if (finalEndDate < finalStartDate) {
        return {
            error: "endDate phai lon hon hoac bang startDate",
        };
    }

    return {
        startDate: finalStartDate,
        endDate: finalEndDate,
    };
};

const createSlotRegistration = async (req, res) => {
    try {
        const {
            amount,
            bankCode,
            endDate,
            locale,
            note,
            packagePlanId,
            slotId,
            startDate,
            vehicleId,
        } = req.body;

        if (!isValidId(vehicleId)) {
            return errorResponse(res, "vehicleId khong hop le", 400);
        }

        if (!isValidId(slotId)) {
            return errorResponse(res, "slotId khong hop le", 400);
        }

        let parsedAmount = parsePositiveAmount(amount);
        let packagePlan = null;

        if (packagePlanId !== undefined && packagePlanId !== null) {
            if (!isValidId(packagePlanId)) {
                return errorResponse(res, "packagePlanId khong hop le", 400);
            }

            packagePlan = await packagePlanService.getPackagePlanById(packagePlanId);

            if (!packagePlan || packagePlan.status !== "ACTIVE") {
                return errorResponse(res, "Khong tim thay goi thang dang mo ban", 404);
            }

            if (packagePlan.vehicleType !== "CAR") {
                return errorResponse(res, "Dang ky slot oto chi nhan goi CAR", 400);
            }

            parsedAmount = Number(packagePlan.price);
        }

        if (!parsedAmount) {
            return errorResponse(
                res,
                "amount phai la so nguyen duong hoac truyen packagePlanId",
                400
            );
        }

        const datePayload = buildRegistrationDates({
            durationDays: packagePlan ? Number(packagePlan.durationDays) : 30,
            startDate,
            endDate,
        });

        if (datePayload.error) {
            return errorResponse(res, datePayload.error, 400);
        }

        const vehicle = await slotRegistrationService.getVehicleForRegistration({
            userId: req.user.id,
            vehicleId,
        });

        if (!vehicle) {
            return errorResponse(res, "Khong tim thay xe cua user", 404);
        }

        if (vehicle.vehicleType !== "CAR") {
            return errorResponse(res, "Chi xe oto moi dang ky vao slot cu the", 400);
        }

        if (vehicle.status !== "APPROVED") {
            return errorResponse(res, "Xe phai duoc admin duyet truoc khi dang ky slot", 400);
        }

        const slot = await slotRegistrationService.getSlotForRegistration(slotId);

        if (!slot) {
            return errorResponse(res, "Khong tim thay slot", 404);
        }

        if (slot.floorType !== "CAR") {
            return errorResponse(res, "Chi slot cua tang CAR moi dang ky oto", 400);
        }

        if (slot.floorStatus !== "ACTIVE") {
            return errorResponse(res, "Tang cua slot dang khong hoat dong", 400);
        }

        if (slot.status !== "AVAILABLE") {
            return errorResponse(res, "Slot khong con trong", 400);
        }

        if (vehicle.buildingId && vehicle.buildingId !== slot.buildingId) {
            return errorResponse(
                res,
                "Xe dang gan voi toa nha khac, khong the dang ky slot nay",
                400
            );
        }

        if (
            packagePlan?.buildingId &&
            Number(packagePlan.buildingId) !== Number(slot.buildingId)
        ) {
            return errorResponse(res, "Goi thang khong thuoc toa nha cua slot", 400);
        }

        const activeVehicleRegistration =
            await slotRegistrationService.findActiveRegistrationByVehicleId(
                vehicleId
            );

        if (activeVehicleRegistration) {
            return errorResponse(res, "Xe da co dang ky slot dang hoat dong", 400);
        }

        const activeSlotRegistration =
            await slotRegistrationService.findActiveRegistrationBySlotId(slotId);

        if (activeSlotRegistration) {
            return errorResponse(res, "Slot da co dang ky dang hoat dong", 400);
        }

        const transactionRef = `SLOT${Date.now()}U${req.user.id}V${vehicleId}`;
        const orderInfo = `Thanh toan dang ky slot ${slot.slotCode} cho xe ${vehicle.plateNumber}`;
        const paymentUrl = createPaymentUrl({
            amount: parsedAmount,
            bankCode,
            clientIp: getClientIp(req),
            locale,
            orderInfo,
            transactionRef,
        });

        const result =
            await slotRegistrationService.createSlotRegistrationWithPayment({
                amount: parsedAmount,
                buildingId: slot.buildingId,
                endDate: datePayload.endDate,
                floorId: slot.floorId,
                note,
                paymentUrl,
                slotId,
                startDate: datePayload.startDate,
                transactionRef,
                userId: req.user.id,
                vehicleId,
            });

        const registration = await slotRegistrationService.getRegistrationById(
            result.registrationId
        );

        return successResponse(
            res,
            "Tao dang ky slot va link thanh toan VNPay thanh cong",
            {
                registration,
                payment: {
                    id: result.paymentId,
                    transactionRef,
                    amount: parsedAmount,
                    provider: "VNPAY",
                    paymentUrl,
                },
            },
            201
        );
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        if (error.code === "SLOT_NOT_AVAILABLE") {
            return errorResponse(res, "Slot vua duoc nguoi khac giu cho", 400);
        }

        return errorResponse(res, "Loi tao dang ky slot", 500, error.message);
    }
};

const getMySlotRegistrations = async (req, res) => {
    try {
        const registrations =
            await slotRegistrationService.getRegistrationsByUserId(req.user.id);

        return successResponse(
            res,
            "Lay danh sach dang ky slot cua toi thanh cong",
            registrations
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach dang ky slot cua toi",
            500,
            error.message
        );
    }
};

const getMySlotRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Registration id khong hop le", 400);
        }

        const registration =
            await slotRegistrationService.getRegistrationByIdAndUserId({
                id,
                userId: req.user.id,
            });

        if (!registration) {
            return errorResponse(res, "Khong tim thay dang ky slot", 404);
        }

        return successResponse(
            res,
            "Lay chi tiet dang ky slot thanh cong",
            registration
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay chi tiet dang ky slot",
            500,
            error.message
        );
    }
};

module.exports = {
    createSlotRegistration,
    getMySlotRegistrationById,
    getMySlotRegistrations,
};
