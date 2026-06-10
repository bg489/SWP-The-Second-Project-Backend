const { PARKING_FEES } = require("../constants/pricing");
const parkingSessionService = require("../services/parkingSession.service");
const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
const { successResponse, errorResponse } = require("../utils/response");

const VALID_VEHICLE_TYPES = ["MOTORBIKE", "CAR"];
const VALID_MANUAL_PAYMENT_METHODS = ["CASH", "CARD"];

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const normalizeEnum = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    return value.trim().toUpperCase();
};

const parseNonNegativeAmount = (value) => {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
};

const calculateBaseFee = (session) => {
    if (session.pricingType === "MONTHLY_PASS") {
        return {
            baseFee: 0,
            durationHours: 0,
        };
    }

    if (session.vehicleType === "MOTORBIKE") {
        return {
            baseFee: PARKING_FEES.MOTORBIKE_TURN,
            durationHours: null,
        };
    }

    const checkInAt = new Date(session.checkInAt);
    const now = new Date();
    const durationMs = Math.max(now.getTime() - checkInAt.getTime(), 0);
    const durationHours = Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)));

    return {
        baseFee: durationHours * PARKING_FEES.CAR_HOURLY,
        durationHours,
    };
};

const checkIn = async (req, res) => {
    try {
        const vehicleType = normalizeEnum(req.body.vehicleType);
        const plateNumber =
            typeof req.body.plateNumber === "string"
                ? req.body.plateNumber.trim().toUpperCase()
                : "";
        const buildingId = req.body.buildingId;
        let floorId = req.body.floorId;
        let slotId = req.body.slotId;

        if (!plateNumber) {
            return errorResponse(res, "Bien so xe khong duoc de trong", 400);
        }

        if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
            return errorResponse(res, "vehicleType chi nhan MOTORBIKE hoac CAR", 400);
        }

        const activeSession =
            await parkingSessionService.getActiveSessionByPlateNumber(plateNumber);

        if (activeSession) {
            return errorResponse(res, "Xe dang co phien gui chua ket thuc", 400);
        }

        const vehicle = await parkingSessionService.getVehicleByPlateNumber(
            plateNumber
        );
        const isApprovedRegisteredVehicle =
            vehicle &&
            vehicle.status === "APPROVED" &&
            vehicle.vehicleType === vehicleType;
        const monthlyPass = isApprovedRegisteredVehicle
            ? await parkingSessionService.getActiveMonthlyPassByVehicleId(vehicle.id)
            : null;
        const pricingType =
            monthlyPass !== null
                ? "MONTHLY_PASS"
                : vehicleType === "MOTORBIKE"
                  ? "TURN"
                  : "HOURLY";
        const customerType = isApprovedRegisteredVehicle
            ? "REGISTERED_USER"
            : "WALK_IN_GUEST";

        if (vehicleType === "MOTORBIKE") {
            if (!isValidId(buildingId)) {
                return errorResponse(res, "buildingId khong hop le", 400);
            }

            if (floorId !== undefined && !isValidId(floorId)) {
                return errorResponse(res, "floorId khong hop le", 400);
            }

            const floor = await parkingSessionService.getMotorbikeFloorForCheckIn({
                buildingId,
                floorId,
            });

            if (!floor) {
                return errorResponse(res, "Khong tim thay tang xe may dang hoat dong", 404);
            }

            if (floor.currentCount >= floor.capacity) {
                return errorResponse(res, "Tang xe may da het suc chua", 400);
            }

            floorId = floor.id;
        }

        if (vehicleType === "CAR") {
            if (!slotId && monthlyPass?.slotId) {
                slotId = monthlyPass.slotId;
            }

            if (!isValidId(slotId)) {
                return errorResponse(res, "slotId khong hop le", 400);
            }

            if (monthlyPass?.slotId && Number(slotId) !== Number(monthlyPass.slotId)) {
                return errorResponse(
                    res,
                    "Xe co the thang chi duoc vao dung slot da dang ky",
                    400
                );
            }

            const slot = await parkingSessionService.getCarSlotForCheckIn(slotId);

            if (!slot) {
                return errorResponse(res, "Khong tim thay slot oto", 404);
            }

            if (slot.floorStatus !== "ACTIVE") {
                return errorResponse(res, "Tang cua slot dang khong hoat dong", 400);
            }

            if (slot.floorType !== "CAR") {
                return errorResponse(res, "slotId phai thuoc tang CAR", 400);
            }

            if (pricingType === "MONTHLY_PASS") {
                if (!["AVAILABLE", "RESERVED"].includes(slot.status)) {
                    return errorResponse(res, "Slot thang khong san sang", 400);
                }
            } else if (slot.status !== "AVAILABLE") {
                return errorResponse(res, "Slot oto khong con trong", 400);
            }

            floorId = slot.floorId;
        }

        const sessionId = await parkingSessionService.createSession({
            allowReservedSlot:
                vehicleType === "CAR" &&
                pricingType === "MONTHLY_PASS" &&
                Boolean(monthlyPass?.slotId),
            buildingId:
                vehicleType === "CAR"
                    ? (await parkingSessionService.getCarSlotForCheckIn(slotId))
                          .buildingId
                    : buildingId,
            customerType,
            floorId,
            monthlyPass,
            note: req.body.note,
            plateNumber,
            pricingType,
            slotId: vehicleType === "CAR" ? slotId : null,
            staffId: req.user.id,
            userId: isApprovedRegisteredVehicle ? vehicle.userId : null,
            vehicleId: isApprovedRegisteredVehicle ? vehicle.id : null,
            vehicleType,
        });

        const session = await parkingSessionService.getSessionById(sessionId);

        return successResponse(res, "Check-in thanh cong", session, 201);
    } catch (error) {
        if (error.code === "MOTORBIKE_FLOOR_FULL") {
            return errorResponse(res, "Tang xe may da het suc chua", 400);
        }

        if (error.code === "CAR_SLOT_NOT_AVAILABLE") {
            return errorResponse(res, "Slot oto khong con san sang", 400);
        }

        return errorResponse(res, "Loi check-in xe", 500, error.message);
    }
};

const checkOut = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Session id khong hop le", 400);
        }

        const session = await parkingSessionService.getSessionById(id);

        if (!session) {
            return errorResponse(res, "Khong tim thay phien gui xe", 404);
        }

        if (session.status === "COMPLETED") {
            return errorResponse(res, "Phien gui xe da ket thuc", 400);
        }

        if (session.status === "PENDING_PAYMENT") {
            return errorResponse(res, "Phien dang cho thanh toan VNPay", 400);
        }

        const violationFee = parseNonNegativeAmount(req.body.violationFee);

        if (violationFee === null) {
            return errorResponse(res, "violationFee phai la so nguyen khong am", 400);
        }

        const { baseFee, durationHours } = calculateBaseFee(session);
        const totalAmount = baseFee + violationFee;
        const paymentMethod = normalizeEnum(req.body.paymentMethod);

        if (totalAmount > 0) {
            if (!paymentMethod) {
                return errorResponse(
                    res,
                    "Can paymentMethod khi totalAmount > 0",
                    400
                );
            }

            if (
                paymentMethod !== "VNPAY" &&
                !VALID_MANUAL_PAYMENT_METHODS.includes(paymentMethod)
            ) {
                return errorResponse(
                    res,
                    "paymentMethod chi nhan CASH, CARD hoac VNPAY khi co phi",
                    400
                );
            }
        }

        if (totalAmount === 0) {
            const transactionRef =
                await parkingSessionService.completeSessionWithManualPayment({
                    baseFee,
                    paymentMethod: "MONTHLY_PASS",
                    paidNote: req.body.paidNote,
                    session,
                    staffId: req.user.id,
                    totalAmount,
                    violationFee,
                    violationNote: req.body.violationNote,
                });
            const completedSession = await parkingSessionService.getSessionById(id);

            return successResponse(res, "Check-out thanh cong, khong phat sinh phi", {
                session: completedSession,
                payment: {
                    transactionRef,
                    method: "MONTHLY_PASS",
                    amount: totalAmount,
                    status: "SUCCESS",
                },
                feeDetail: {
                    baseFee,
                    violationFee,
                    totalAmount,
                    durationHours,
                },
            });
        }

        if (paymentMethod === "VNPAY") {
            const transactionRef = `PARK${Date.now()}S${session.id}`;
            const orderInfo = `Thanh toan phien gui xe ${session.plateNumber}`;
            const paymentUrl = createPaymentUrl({
                amount: totalAmount,
                bankCode: req.body.bankCode,
                clientIp: getClientIp(req),
                locale: req.body.locale,
                orderInfo,
                transactionRef,
            });

            await parkingSessionService.createPendingVnpayPayment({
                baseFee,
                paymentUrl,
                session,
                staffId: req.user.id,
                totalAmount,
                transactionRef,
                violationFee,
                violationNote: req.body.violationNote,
            });

            const pendingSession = await parkingSessionService.getSessionById(id);

            return successResponse(res, "Tao link thanh toan VNPay thanh cong", {
                session: pendingSession,
                payment: {
                    provider: "VNPAY",
                    transactionRef,
                    amount: totalAmount,
                    paymentUrl,
                },
                feeDetail: {
                    baseFee,
                    violationFee,
                    totalAmount,
                    durationHours,
                },
            });
        }

        const transactionRef =
            await parkingSessionService.completeSessionWithManualPayment({
                baseFee,
                paymentMethod,
                paidNote: req.body.paidNote,
                session,
                staffId: req.user.id,
                totalAmount,
                violationFee,
                violationNote: req.body.violationNote,
            });
        const completedSession = await parkingSessionService.getSessionById(id);

        return successResponse(res, "Check-out va thanh toan thanh cong", {
            session: completedSession,
            payment: {
                transactionRef,
                method: paymentMethod,
                amount: totalAmount,
                status: "SUCCESS",
            },
            feeDetail: {
                baseFee,
                violationFee,
                totalAmount,
                durationHours,
            },
        });
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(res, "Loi check-out xe", 500, error.message);
    }
};

const getActiveSessions = async (req, res) => {
    try {
        const sessions = await parkingSessionService.getActiveSessions();

        return successResponse(res, "Lay danh sach phien dang gui thanh cong", sessions);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach phien dang gui",
            500,
            error.message
        );
    }
};

const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Session id khong hop le", 400);
        }

        const session = await parkingSessionService.getSessionById(id);

        if (!session) {
            return errorResponse(res, "Khong tim thay phien gui xe", 404);
        }

        return successResponse(res, "Lay chi tiet phien gui xe thanh cong", session);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet phien gui xe", 500, error.message);
    }
};

module.exports = {
    checkIn,
    checkOut,
    getActiveSessions,
    getSessionById,
};
