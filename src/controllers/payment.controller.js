const slotRegistrationService = require("../services/slotRegistration.service");
const parkingSessionService = require("../services/parkingSession.service");
const { verifyReturnParams } = require("../utils/vnpay");
const { successResponse, errorResponse } = require("../utils/response");

const buildPaymentResult = (query, secureHash) => {
    const responseCode = query.vnp_ResponseCode;
    const transactionStatus = query.vnp_TransactionStatus;

    return {
        bankCode: query.vnp_BankCode,
        payDate: query.vnp_PayDate,
        providerTransactionNo: query.vnp_TransactionNo,
        responseCode,
        secureHash: query.vnp_SecureHash || secureHash,
        status:
            responseCode === "00" && transactionStatus === "00"
                ? "SUCCESS"
                : "FAILED",
        transactionRef: query.vnp_TxnRef,
        transactionStatus,
    };
};

const isAmountMatched = (payment, queryAmount) => {
    return Number(queryAmount) === Math.round(Number(payment.amount) * 100);
};

const handleVerifiedVnpayResult = async (query, secureHash) => {
    const paymentResult = buildPaymentResult(query, secureHash);
    const payment = await slotRegistrationService.getPaymentByTransactionRef(
        paymentResult.transactionRef
    );

    if (!payment) {
        return {
            error: "Khong tim thay payment",
            statusCode: 404,
            rspCode: "01",
            message: "Order not found",
        };
    }

    if (!isAmountMatched(payment, query.vnp_Amount)) {
        return {
            error: "So tien thanh toan khong khop",
            statusCode: 400,
            rspCode: "04",
            message: "Invalid amount",
        };
    }

    if (payment.status !== "PENDING") {
        const registration = payment.slotRegistrationId
            ? await slotRegistrationService.getRegistrationById(
                  payment.slotRegistrationId
              )
            : null;
        const session = payment.parkingSessionId
            ? await parkingSessionService.getSessionById(payment.parkingSessionId)
            : null;

        return {
            alreadyConfirmed: true,
            rspCode: "02",
            message: "Order already confirmed",
            data: {
                payment: {
                    ...payment,
                    status: payment.status,
                },
                registration,
                session,
            },
        };
    }

    await slotRegistrationService.markPaymentResult({
        ...paymentResult,
        parkingSessionId: payment.parkingSessionId,
        registrationId: payment.slotRegistrationId,
        sessionStatus: payment.parkingSessionId
            ? {
                  floorId: payment.sessionFloorId,
                  pricingType: payment.sessionPricingType,
                  slotId: payment.sessionSlotId,
                  vehicleType: payment.sessionVehicleType,
              }
            : null,
        slotId: payment.registrationSlotId,
    });

    const registration = payment.slotRegistrationId
        ? await slotRegistrationService.getRegistrationById(payment.slotRegistrationId)
        : null;
    const session = payment.parkingSessionId
        ? await parkingSessionService.getSessionById(payment.parkingSessionId)
        : null;

    return {
        rspCode: "00",
        message: "Confirm Success",
        data: {
            payment: {
                id: payment.id,
                transactionRef: payment.transactionRef,
                amount: payment.amount,
                status: paymentResult.status,
                responseCode: paymentResult.responseCode,
                transactionStatus: paymentResult.transactionStatus,
            },
            registration,
            session,
        },
    };
};

const handleVnpayReturn = async (req, res) => {
    try {
        const { isValid, secureHash } = verifyReturnParams(req.query);

        if (!isValid) {
            return errorResponse(res, "Chu ky VNPay khong hop le", 400);
        }

        const result = await handleVerifiedVnpayResult(req.query, secureHash);

        if (result.error) {
            return errorResponse(res, result.error, result.statusCode);
        }

        return successResponse(
            res,
            result.data.payment.status === "SUCCESS"
                ? "Thanh toan VNPay thanh cong"
                : "Thanh toan VNPay that bai",
            result.data
        );
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(res, "Loi xu ly VNPay return", 500, error.message);
    }
};

const handleVnpayIpn = async (req, res) => {
    try {
        const { isValid, secureHash } = verifyReturnParams(req.query);

        if (!isValid) {
            return res.status(200).json({
                RspCode: "97",
                Message: "Invalid Checksum",
            });
        }

        const result = await handleVerifiedVnpayResult(req.query, secureHash);

        return res.status(200).json({
            RspCode: result.rspCode,
            Message: result.message,
        });
    } catch (error) {
        return res.status(200).json({
            RspCode: "99",
            Message: error.message || "Unknown error",
        });
    }
};

module.exports = {
    handleVnpayIpn,
    handleVnpayReturn,
};
