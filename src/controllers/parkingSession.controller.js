const { PARKING_FEES } = require("../constants/pricing");
const parkingSessionService = require("../services/parkingSession.service");
const pricingPolicyService = require("../services/pricingPolicy.service");
const qrPassService = require("../services/qrPass.service");
const tempQrCardService = require("../services/tempQrCard.service");
const userService = require("../services/user.service");
const violationService = require("../services/violation.service");
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

const normalizePlateCode = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s.-]/g, "");

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

const getPolicyAmount = async ({ buildingId, fallbackAmount, pricingType, vehicleType }) => {
    const policy = await pricingPolicyService.getActivePricingPolicy({
        buildingId,
        pricingType,
        vehicleType,
    });

    return policy ? Number(policy.amount) : fallbackAmount;
};

const calculateBaseFee = async (session) => {
    if (session.pricingType === "MONTHLY_PASS") {
        return {
            baseFee: 0,
            durationHours: 0,
        };
    }

    if (session.vehicleId) {
        const activeMonthlyPass =
            await parkingSessionService.getActiveMonthlyPassByVehicleId(session.vehicleId);

        if (activeMonthlyPass) {
            return {
                baseFee: 0,
                durationHours: 0,
            };
        }
    }

    if (session.vehicleType === "MOTORBIKE") {
        const amount = await getPolicyAmount({
            buildingId: session.buildingId,
            fallbackAmount: PARKING_FEES.MOTORBIKE_TURN,
            pricingType: "TURN",
            vehicleType: "MOTORBIKE",
        });

        return {
            baseFee: amount,
            durationHours: null,
        };
    }

    const hourlyAmount = await getPolicyAmount({
        buildingId: session.buildingId,
        fallbackAmount: PARKING_FEES.CAR_HOURLY,
        pricingType: "HOURLY",
        vehicleType: "CAR",
    });
    const checkInAt = new Date(session.checkInAt);
    const now = new Date();
    const durationMs = Math.max(now.getTime() - checkInAt.getTime(), 0);
    const durationHours = Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)));

    return {
        baseFee: durationHours * hourlyAmount,
        durationHours,
    };
};

const checkIn = async (req, res) => {
    try {
        let vehicleType = normalizeEnum(req.body.vehicleType);
        let plateNumber =
            typeof req.body.plateNumber === "string"
                ? req.body.plateNumber.trim().toUpperCase()
                : "";
        const staffUser = await userService.getUserById(req.user.id);
        const staffBuildingId = staffUser?.buildingId;
        const requestedBuildingId = req.body.buildingId;
        const buildingId = staffBuildingId || requestedBuildingId;
        let floorId = req.body.floorId;
        let slotId = req.body.slotId;
        const qrCode =
            typeof req.body.qrCode === "string" ? req.body.qrCode.trim() : "";
        let qrValidation = null;

        if (qrCode) {
            qrValidation = await qrPassService.validateQrPass(qrCode, {
                buildingId,
            });

            if (!qrValidation.isValid) {
                return errorResponse(res, qrValidation.message, 400, qrValidation);
            }

            if (!plateNumber) {
                plateNumber = qrValidation.qrPass.plateNumber;
            }

            if (!vehicleType) {
                vehicleType = qrValidation.qrPass.vehicleType;
            }

            if (
                normalizePlateCode(plateNumber) !==
                normalizePlateCode(qrValidation.qrPass.plateNumber)
            ) {
                return errorResponse(res, "Mã QR không khớp biển số xe.", 400);
            }

            if (vehicleType !== qrValidation.qrPass.vehicleType) {
                return errorResponse(res, "Mã QR không khớp loại xe.", 400);
            }

            plateNumber = qrValidation.qrPass.plateNumber;
            vehicleType = qrValidation.qrPass.vehicleType;
        }

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Tài khoản nhân viên chưa được gắn tòa nhà.", 400);
        }

        if (
            requestedBuildingId &&
            Number(requestedBuildingId) !== Number(buildingId)
        ) {
            return errorResponse(
                res,
                "Nhân viên chỉ được nhận xe trong tòa nhà đang phụ trách.",
                403
            );
        }

        if (!plateNumber) {
            return errorResponse(res, "Biển số xe không được để trống.", 400);
        }

        if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
            return errorResponse(res, "Loại xe chỉ nhận xe máy hoặc ô tô.", 400);
        }

        const activeSession =
            await parkingSessionService.getActiveSessionByPlateNumber(plateNumber);

        if (activeSession) {
            return errorResponse(res, "Xe đang có phiên gửi chưa kết thúc.", 400);
        }

        const vehicle = await parkingSessionService.getVehicleByPlateNumber(
            plateNumber
        );
        const isApprovedRegisteredVehicle =
            vehicle &&
            vehicle.status === "APPROVED" &&
            vehicle.vehicleType === vehicleType;

        if (
            isApprovedRegisteredVehicle &&
            vehicle.buildingId &&
            Number(vehicle.buildingId) !== Number(buildingId)
        ) {
            return errorResponse(
                res,
                "Xe đang thuộc tòa nhà khác, không thể nhận xe tại tòa nhà này.",
                400
            );
        }
        const activeMonthlyPass = isApprovedRegisteredVehicle
            ? await parkingSessionService.getActiveMonthlyPassByVehicleId(vehicle.id)
            : null;
        const monthlyPass =
            activeMonthlyPass &&
            (!activeMonthlyPass.buildingId ||
                Number(activeMonthlyPass.buildingId) === Number(buildingId))
                ? activeMonthlyPass
                : null;
        const tempQrCardId = req.body.tempQrCardId;
        const tempQrCardCode =
            typeof req.body.tempQrCardCode === "string"
                ? req.body.tempQrCardCode.trim().toUpperCase()
                : "";
        const pricingType =
            monthlyPass !== null
                ? "MONTHLY_PASS"
                : vehicleType === "MOTORBIKE"
                  ? "TURN"
                  : "HOURLY";
        const customerType = isApprovedRegisteredVehicle
            ? "REGISTERED_USER"
            : "WALK_IN_GUEST";
        let tempQrCard = null;

        if (qrValidation?.qrPass && vehicle && qrValidation.qrPass.vehicleId !== vehicle.id) {
            return errorResponse(res, "Mã QR không thuộc xe đang nhận vào.", 400);
        }

        if (pricingType === "MONTHLY_PASS" && !qrCode) {
            return errorResponse(res, "Xe có gói tháng cần quét mã QR để nhận vào.", 400);
        }

        if (pricingType !== "MONTHLY_PASS") {
            if (!isValidId(tempQrCardId) && !tempQrCardCode) {
                return errorResponse(
                    res,
                    "Khách gửi lẻ cần có thẻ QR tạm.",
                    400
                );
            }

            tempQrCard = isValidId(tempQrCardId)
                ? await tempQrCardService.getTempQrCardById(tempQrCardId)
                : await tempQrCardService.getTempQrCardByCode(tempQrCardCode);

            if (!tempQrCard) {
                return errorResponse(res, "Khong tim thay the QR tam", 404);
            }

            if (
                tempQrCard.buildingId &&
                Number(tempQrCard.buildingId) !== Number(buildingId)
            ) {
                return errorResponse(res, "Thẻ QR tạm không thuộc tòa nhà đang phụ trách.", 400);
            }

            if (tempQrCard.status !== "READY") {
                return errorResponse(res, "Thẻ QR tạm chưa sẵn sàng sử dụng.", 400);
            }
        }

        if (vehicleType === "MOTORBIKE") {
            if (!isValidId(buildingId)) {
                return errorResponse(res, "Tòa nhà không hợp lệ.", 400);
            }

            if (floorId !== undefined && !isValidId(floorId)) {
                return errorResponse(res, "Tầng xe máy không hợp lệ.", 400);
            }

            const floor = await parkingSessionService.getMotorbikeFloorForCheckIn({
                buildingId,
                floorId,
            });

            if (!floor) {
                return errorResponse(res, "Không tìm thấy tầng xe máy đang hoạt động.", 404);
            }

            if (floor.currentCount >= floor.capacity) {
                return errorResponse(res, "Tầng xe máy đã hết sức chứa.", 400);
            }

            floorId = floor.id;
        }

        if (vehicleType === "CAR") {
            if (!slotId && monthlyPass?.slotId) {
                slotId = monthlyPass.slotId;
            }

            if (!isValidId(slotId)) {
                return errorResponse(res, "Ô đỗ ô tô không hợp lệ.", 400);
            }

            if (monthlyPass?.slotId && Number(slotId) !== Number(monthlyPass.slotId)) {
                return errorResponse(
                    res,
                    "Xe có gói tháng chỉ được vào đúng ô đã đăng ký.",
                    400
                );
            }

            const slot = await parkingSessionService.getCarSlotForCheckIn(slotId);

            if (!slot) {
                return errorResponse(res, "Không tìm thấy ô đỗ ô tô.", 404);
            }

            if (Number(slot.buildingId) !== Number(buildingId)) {
                return errorResponse(
                    res,
                    "Ô đỗ ô tô không thuộc tòa nhà nhân viên đang phụ trách.",
                    403
                );
            }

            if (slot.floorStatus !== "ACTIVE") {
                return errorResponse(res, "Tầng của ô đỗ đang không hoạt động.", 400);
            }

            if (slot.floorType !== "CAR") {
                return errorResponse(res, "Ô đỗ phải thuộc tầng ô tô.", 400);
            }

            if (pricingType === "MONTHLY_PASS") {
                if (!["AVAILABLE", "RESERVED"].includes(slot.status)) {
                    return errorResponse(res, "Ô đỗ của gói tháng chưa sẵn sàng.", 400);
                }
            } else if (slot.status !== "AVAILABLE") {
                return errorResponse(res, "Ô đỗ ô tô không còn trống.", 400);
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
                    ? buildingId
                    : buildingId,
            customerType,
            floorId,
            monthlyPass,
            note: req.body.note,
            plateNumber,
            pricingType,
            sessionQrCode:
                pricingType === "MONTHLY_PASS"
                    ? qrCode || null
                    : tempQrCard.cardCode,
            slotId: vehicleType === "CAR" ? slotId : null,
            staffId: req.user.id,
            tempQrCardId: tempQrCard?.id || null,
            userId: isApprovedRegisteredVehicle ? vehicle.userId : null,
            vehicleId: isApprovedRegisteredVehicle ? vehicle.id : null,
            vehicleType,
        });

        const session = await parkingSessionService.getSessionById(sessionId);

        return successResponse(res, "Nhận xe vào bãi thành công.", session, 201);
    } catch (error) {
        if (error.code === "MOTORBIKE_FLOOR_FULL") {
            return errorResponse(res, "Tầng xe máy đã hết sức chứa.", 400);
        }

        if (error.code === "CAR_SLOT_NOT_AVAILABLE") {
            return errorResponse(res, "Ô đỗ ô tô không còn sẵn sàng.", 400);
        }

        return errorResponse(res, "Lỗi nhận xe vào bãi.", 500, error.message);
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

        const manualViolationFee = parseNonNegativeAmount(req.body.violationFee);

        if (manualViolationFee === null) {
            return errorResponse(res, "violationFee phai la so nguyen khong am", 400);
        }

        const violationSummary =
            await violationService.getCollectableViolationsForSession(session);
        const recordedViolationFee = violationSummary.totalFee;
        const violationFee = recordedViolationFee + manualViolationFee;
        const { baseFee, durationHours } = await calculateBaseFee(session);
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
                    manualViolationFee,
                    recordedViolationFee,
                    violationFee,
                    violations: violationSummary.violations,
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
                    manualViolationFee,
                    recordedViolationFee,
                    violationFee,
                    violations: violationSummary.violations,
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
                manualViolationFee,
                recordedViolationFee,
                violationFee,
                violations: violationSummary.violations,
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
        const staffUser = await userService.getUserById(req.user.id);
        const buildingId = staffUser?.buildingId || req.query.buildingId;
        const sessions = await parkingSessionService.getActiveSessions({
            buildingId,
        });

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

const getMyActiveSessions = async (req, res) => {
    try {
        const sessions = await parkingSessionService.getActiveSessionsByUserId(
            req.user.id
        );

        return successResponse(
            res,
            "Lay danh sach phien dang gui cua toi thanh cong",
            sessions
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach phien dang gui cua toi",
            500,
            error.message
        );
    }
};

const checkOutByQr = async (req, res) => {
    try {
        const qrCode =
            typeof req.body.qrCode === "string" ? req.body.qrCode.trim() : "";

        if (!qrCode) {
            return errorResponse(res, "Mã QR không được để trống.", 400);
        }

        const session = await parkingSessionService.getActiveSessionByQrCode(qrCode);

        if (!session) {
            return errorResponse(res, "Không tìm thấy phiên gửi xe đang hoạt động theo mã QR.", 404);
        }

        req.params.id = session.id;
        return checkOut(req, res);
    } catch (error) {
        return errorResponse(res, "Lỗi cho xe ra bằng mã QR.", 500, error.message);
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
    checkOutByQr,
    getActiveSessions,
    getMyActiveSessions,
    getSessionById,
};
