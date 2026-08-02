/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của payment.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `slotRegistrationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/payment.controller.js.
 */
const slotRegistrationService = require("../services/slotRegistration.service");
/**
 * Khai báo `parkingSessionService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/payment.controller.js.
 */
const parkingSessionService = require("../services/parkingSession.service");
/**
 * Khai báo `monthlyPassService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/payment.controller.js.
 */
const monthlyPassService = require("../services/monthlyPass.service");
/**
 * Khai báo `hourlySlotReservationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/payment.controller.js.
 */
const hourlySlotReservationService = require("../services/hourlySlotReservation.service");
/**
 * Khai báo `smsService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/payment.controller.js.
 */
const smsService = require("../services/sms.service");
const { verifyReturnParams } = require("../utils/vnpay");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Tạo nghiệp vụ `buildPaymentResult` (build payment result). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function buildPaymentResult
 * @param {*} query - Giá trị `query` được hàm sử dụng trong quá trình xử lý.
 * @param {*} secureHash - Giá trị `secureHash` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildPaymentResult = (query, secureHash) => {
    const responseCode = query.vnp_ResponseCode;
    const transactionStatus = query.vnp_TransactionStatus;

    const isSuccess =
        responseCode === "00" && (!transactionStatus || transactionStatus === "00");

    return {
        bankCode: query.vnp_BankCode,
        payDate: query.vnp_PayDate,
        providerTransactionNo: query.vnp_TransactionNo,
        responseCode,
        secureHash: query.vnp_SecureHash || secureHash,
        status: isSuccess ? "SUCCESS" : "FAILED",
        transactionRef: query.vnp_TxnRef,
        transactionStatus,
    };
};

/**
 * Kiểm tra nghiệp vụ `isAmountMatched` (is amount matched). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isAmountMatched
 * @param {*} payment - Giá trị `payment` được hàm sử dụng trong quá trình xử lý.
 * @param {*} queryAmount - Giá trị `queryAmount` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isAmountMatched = (payment, queryAmount) => {
    return Number(queryAmount) === Math.round(Number(payment.amount) * 100);
};

/**
 * Thực hiện nghiệp vụ `appendQuery` (append query). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function appendQuery
 * @param {*} url - Giá trị `url` được hàm sử dụng trong quá trình xử lý.
 * @param {*} params - Giá trị `params` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const appendQuery = (url, params) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${new URLSearchParams(params).toString()}`;
};

/**
 * Tạo nghiệp vụ `buildFrontendRouteUrl` (build frontend route url). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function buildFrontendRouteUrl
 * @param {*} targetPath - Giá trị `targetPath` được hàm sử dụng trong quá trình xử lý.
 * @param {*} exactUrl - Giá trị `exactUrl` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildFrontendRouteUrl = (targetPath, exactUrl) => {
    const configuredUrl =
        exactUrl ||
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        process.env.FRONTEND_PAYMENT_RETURN_URL ||
        "http://localhost:5173";

    try {
        const url = new URL(configuredUrl);

        if (!exactUrl) {
            url.pathname = targetPath;
            url.search = "";
            url.hash = "";
        }

        return url.toString();
    } catch {
        return exactUrl || `${configuredUrl.replace(/\/$/, "")}${targetPath}`;
    }
};

/**
 * Lấy nghiệp vụ `getFrontendPaymentReturnUrl` (get frontend payment return url). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function getFrontendPaymentReturnUrl
 * @param {*} result - Giá trị `result` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getFrontendPaymentReturnUrl = (result) => {
    const payment = result.data?.payment || {};
    const hourlyReservation = result.data?.hourlyReservation;
    const isParkingCheckout = Boolean(
        result.data?.session || payment.parkingSessionId
    );
    const isHourlyReservation = Boolean(hourlyReservation);
    const isStaffReservation =
        isHourlyReservation &&
        ["STAFF", "MANAGER", "ADMIN"].includes(hourlyReservation.createdByRole);
    const targetPath = isParkingCheckout
        ? "/staff/check-out"
        : isHourlyReservation
          ? isStaffReservation
              ? "/staff/slot-reservations"
              : "/user/slot-reservations"
          : "/user/qr-pass";
    const exactReturnUrl = isParkingCheckout
        ? process.env.FRONTEND_CHECKOUT_PAYMENT_RETURN_URL
        : isHourlyReservation
          ? isStaffReservation
              ? process.env.FRONTEND_STAFF_RESERVATION_PAYMENT_RETURN_URL
              : process.env.FRONTEND_USER_RESERVATION_PAYMENT_RETURN_URL
          : process.env.FRONTEND_PACKAGE_PAYMENT_RETURN_URL;
    const returnUrl = buildFrontendRouteUrl(targetPath, exactReturnUrl);

    return appendQuery(returnUrl, {
        paymentStatus: payment.status || "FAILED",
        responseCode: payment.responseCode || "",
        smsError: result.data?.sms?.error || "",
        smsStatus: result.data?.sms?.status || "",
        transactionRef: payment.transactionRef || "",
    });
};

/**
 * Xử lý nghiệp vụ `handleVerifiedVnpayResult` (handle verified vnpay result). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function handleVerifiedVnpayResult
 * @param {*} query - Giá trị `query` được hàm sử dụng trong quá trình xử lý.
 * @param {*} secureHash - Giá trị `secureHash` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
        const monthlyPass = payment.monthlyPassId
            ? await monthlyPassService.getMonthlyPassById(payment.monthlyPassId)
            : null;
        const hourlyReservation = payment.hourlyReservationId
            ? await hourlySlotReservationService.getReservationById(
                  payment.hourlyReservationId
              )
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
                monthlyPass,
                hourlyReservation,
            },
        };
    }

    const paymentUpdate = await slotRegistrationService.markPaymentResult({
        ...paymentResult,
        monthlyPassId: payment.monthlyPassId,
        hourlyReservationId: payment.hourlyReservationId,
        paymentId: payment.id,
        parkingSessionId: payment.parkingSessionId,
        registrationId: payment.slotRegistrationId,
        sessionStatus: payment.parkingSessionId
            ? {
                  floorId: payment.sessionFloorId,
                  plateNumber: payment.sessionPlateNumber,
                  pricingType: payment.sessionPricingType,
                  slotId: payment.sessionSlotId,
                  tempQrCardId: payment.sessionTempQrCardId,
                  vehicleType: payment.sessionVehicleType,
                  hourlyReservationId:
                      payment.sessionHourlyReservationId,
              }
            : null,
        slotId: payment.registrationSlotId,
    });
    let sms = null;

    if (paymentUpdate?.smsOutboxId) {
        try {
            const deliveries = await smsService.processPendingSms({
                ids: [paymentUpdate.smsOutboxId],
                limit: 1,
            });

            sms = deliveries[0] || {
                id: paymentUpdate.smsOutboxId,
                status: "PENDING",
            };
        } catch (smsError) {
            sms = {
                error: smsError.message,
                id: paymentUpdate.smsOutboxId,
                status: "FAILED",
            };
        }
    }

    const registration = payment.slotRegistrationId
        ? await slotRegistrationService.getRegistrationById(payment.slotRegistrationId)
        : null;
    const session = payment.parkingSessionId
        ? await parkingSessionService.getSessionById(payment.parkingSessionId)
        : null;
    const monthlyPass = payment.monthlyPassId
        ? await monthlyPassService.getMonthlyPassById(payment.monthlyPassId)
        : null;
    const hourlyReservation = payment.hourlyReservationId
        ? await hourlySlotReservationService.getReservationById(
              payment.hourlyReservationId
          )
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
            monthlyPass,
            hourlyReservation,
            sms,
        },
    };
};

/**
 * Xử lý nghiệp vụ `handleVnpayReturn` (handle vnpay return). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function handleVnpayReturn
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

        if (req.query.json === "true") {
            return successResponse(
                res,
                result.data.payment.status === "SUCCESS"
                    ? "Thanh toan VNPay thanh cong"
                    : "Thanh toan VNPay that bai",
                result.data
            );
        }

        return res.redirect(getFrontendPaymentReturnUrl(result));
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(res, "Loi xu ly VNPay return", 500, error.message);
    }
};

/**
 * Xử lý nghiệp vụ `handleVnpayIpn` (handle vnpay ipn). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function handleVnpayIpn
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
    getFrontendPaymentReturnUrl,
    handleVnpayIpn,
    handleVnpayReturn,
};
