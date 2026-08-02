/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của hourlySlotReservation.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `hourlySlotReservationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/hourlySlotReservation.controller.js.
 */
const hourlySlotReservationService = require("../services/hourlySlotReservation.service");
/**
 * Khai báo `smsService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/hourlySlotReservation.controller.js.
 */
const smsService = require("../services/sms.service");
const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
const {
    isValidVietnamPhone,
    normalizeOptionalPhone,
} = require("../utils/phone");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Khai báo `VALID_STAFF_PAYMENT_METHODS` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/controllers/hourlySlotReservation.controller.js.
 */
const VALID_STAFF_PAYMENT_METHODS = ["CASH", "VNPAY"];
/**
 * Khai báo `VIETNAM_TIME_ZONE` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/controllers/hourlySlotReservation.controller.js.
 */
const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
/**
 * Khai báo `MAX_RESERVATION_MONTHS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/controllers/hourlySlotReservation.controller.js.
 */
const MAX_RESERVATION_MONTHS = 2;

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (value) => {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeEnum` (normalize enum). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function normalizeEnum
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeEnum = (value) =>
    typeof value === "string" ? value.trim().toUpperCase() : "";

/**
 * Lấy nghiệp vụ `getVietnamDateKey` (get vietnam date key). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function getVietnamDateKey
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getVietnamDateKey = (date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: VIETNAM_TIME_ZONE,
        year: "numeric",
    }).formatToParts(date);
    const values = Object.fromEntries(
        parts
            /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            .filter((part) => part.type !== "literal")
            /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            .map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseReservationPeriod` (parse reservation period). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parseReservationPeriod
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parseReservationPeriod = ({ endAt, startAt }) => {
    const parsedStartAt = new Date(startAt);
    const parsedEndAt = new Date(endAt);

    if (
        !startAt ||
        !endAt ||
        Number.isNaN(parsedStartAt.getTime()) ||
        Number.isNaN(parsedEndAt.getTime())
    ) {
        return {
            error: "Thời gian bắt đầu và kết thúc không hợp lệ.",
        };
    }

    if (parsedEndAt.getTime() <= parsedStartAt.getTime()) {
        return {
            error: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        };
    }

    if (parsedStartAt.getTime() < Date.now() - 60 * 1000) {
        return {
            error: "Thời gian bắt đầu không được nằm trong quá khứ.",
        };
    }

    const maximumReservationTime = new Date();

    maximumReservationTime.setMonth(
        maximumReservationTime.getMonth() + MAX_RESERVATION_MONTHS
    );

    if (
        parsedStartAt.getTime() > maximumReservationTime.getTime() ||
        parsedEndAt.getTime() > maximumReservationTime.getTime()
    ) {
        return {
            error: "Chỉ được đặt ô trước tối đa 2 tháng.",
        };
    }

    if (getVietnamDateKey(parsedStartAt) !== getVietnamDateKey(parsedEndAt)) {
        return {
            error: "Lượt đặt ô phải bắt đầu và kết thúc trong cùng một ngày.",
        };
    }

    return {
        endAt: parsedEndAt,
        startAt: parsedStartAt,
    };
};

/**
 * Xử lý nghiệp vụ `resolveBuildingId` (resolve building id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung.
 *
 * @function resolveBuildingId
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} requestedBuildingId - Giá trị `requestedBuildingId` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const resolveBuildingId = (req, requestedBuildingId) => {
    const role = req.user.role;
    const accountBuildingId = req.user.buildingId;

    if (role === "USER" || role === "STAFF") {
        if (!isValidId(accountBuildingId)) {
            return {
                error: "Tài khoản chưa được gán vào tòa nhà.",
            };
        }

        if (
            requestedBuildingId &&
            Number(requestedBuildingId) !== Number(accountBuildingId)
        ) {
            return {
                error: "Bạn chỉ được đặt ô trong tòa nhà đang sử dụng.",
                statusCode: 403,
            };
        }

        return {
            buildingId: Number(accountBuildingId),
        };
    }

    const buildingId = requestedBuildingId || accountBuildingId;

    if (!isValidId(buildingId)) {
        return {
            error: "Vui lòng chọn tòa nhà.",
        };
    }

    return {
        buildingId: Number(buildingId),
    };
};

/**
 * Tạo nghiệp vụ `buildAvailabilityPayload` (build availability payload). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung.
 *
 * @function buildAvailabilityPayload
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const buildAvailabilityPayload = async (req) => {
    const buildingResult = resolveBuildingId(req, req.query.buildingId);

    if (buildingResult.error) {
        return buildingResult;
    }

    const period = parseReservationPeriod({
        endAt: req.query.endAt,
        startAt: req.query.startAt,
    });

    if (period.error) {
        return period;
    }

    const quote = await hourlySlotReservationService.getReservationQuote({
        buildingId: buildingResult.buildingId,
        ...period,
    });
    const slots = await hourlySlotReservationService.getAvailableSlots({
        buildingId: buildingResult.buildingId,
        ...period,
    });

    return {
        buildingId: buildingResult.buildingId,
        endAt: period.endAt,
        quote,
        slots,
        startAt: period.startAt,
    };
};

/**
 * Lấy nghiệp vụ `getAvailability` (get availability). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getAvailability
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAvailability = async (req, res) => {
    try {
        const data = await buildAvailabilityPayload(req);

        if (data.error) {
            return errorResponse(res, data.error, data.statusCode || 400);
        }

        return successResponse(
            res,
            "Đã tải các ô đỗ phù hợp với khung giờ đã chọn.",
            data
        );
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(
            res,
            "Không thể tải danh sách ô đỗ theo giờ.",
            500,
            error.message
        );
    }
};

/**
 * Tạo nghiệp vụ `createUserReservation` (create user reservation). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createUserReservation
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createUserReservation = async (req, res) => {
    try {
        const { bankCode, endAt, locale, note, slotId, startAt, vehicleId } =
            req.body;
        const buildingResult = resolveBuildingId(req, req.body.buildingId);

        if (buildingResult.error) {
            return errorResponse(
                res,
                buildingResult.error,
                buildingResult.statusCode || 400
            );
        }

        if (!isValidId(vehicleId)) {
            return errorResponse(res, "Vui lòng chọn ô tô đã được duyệt.", 400);
        }

        if (!isValidId(slotId)) {
            return errorResponse(res, "Vui lòng chọn ô đỗ ô tô.", 400);
        }

        const period = parseReservationPeriod({ endAt, startAt });

        if (period.error) {
            return errorResponse(res, period.error, 400);
        }

        const quote = await hourlySlotReservationService.getReservationQuote({
            buildingId: buildingResult.buildingId,
            ...period,
        });
        const transactionRef = `HRS${Date.now()}U${req.user.id}V${vehicleId}`;
        const paymentUrl = createPaymentUrl({
            amount: quote.amount,
            bankCode,
            clientIp: getClientIp(req),
            locale,
            orderInfo: "Thanh toán đặt trước ô đỗ ô tô theo giờ",
            transactionRef,
        });
        const result =
            await hourlySlotReservationService.createReservationWithPayment({
                ...period,
                ...quote,
                buildingId: buildingResult.buildingId,
                createdBy: req.user.id,
                customerType: "REGISTERED_USER",
                note,
                paymentMethod: "VNPAY",
                paymentUrl,
                slotId: Number(slotId),
                transactionRef,
                userId: req.user.id,
                vehicleId: Number(vehicleId),
            });
        const reservation =
            await hourlySlotReservationService.getReservationById(
                result.reservationId
            );

        return successResponse(
            res,
            "Đã tạo yêu cầu đặt ô. Vui lòng hoàn tất thanh toán để giữ chỗ.",
            {
                reservation,
                payment: {
                    amount: quote.amount,
                    id: result.paymentId,
                    paymentUrl,
                    provider: "VNPAY",
                    transactionRef,
                },
            },
            201
        );
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(
            res,
            "Không thể tạo lượt đặt ô theo giờ.",
            500,
            error.message
        );
    }
};

/**
 * Tạo nghiệp vụ `createGuestReservation` (create guest reservation). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createGuestReservation
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createGuestReservation = async (req, res) => {
    try {
        const {
            bankCode,
            endAt,
            guestName,
            guestPhone,
            locale,
            note,
            paymentMethod: rawPaymentMethod,
            plateNumber,
            slotId,
            startAt,
        } = req.body;
        const buildingResult = resolveBuildingId(req, req.body.buildingId);

        if (buildingResult.error) {
            return errorResponse(
                res,
                buildingResult.error,
                buildingResult.statusCode || 400
            );
        }

        if (!String(guestName || "").trim()) {
            return errorResponse(res, "Vui lòng nhập tên khách gửi xe.", 400);
        }

        const normalizedGuestPhone = normalizeOptionalPhone(guestPhone);

        if (!normalizedGuestPhone) {
            return errorResponse(res, "Vui lòng nhập số điện thoại của khách.", 400);
        }

        if (!isValidVietnamPhone(normalizedGuestPhone)) {
            return errorResponse(
                res,
                "Số điện thoại của khách phải có đúng 10 chữ số và bắt đầu bằng 0.",
                400
            );
        }

        if (!String(plateNumber || "").trim()) {
            return errorResponse(res, "Vui lòng nhập biển số xe.", 400);
        }

        if (!isValidId(slotId)) {
            return errorResponse(res, "Vui lòng chọn ô đỗ ô tô.", 400);
        }

        const paymentMethod = normalizeEnum(rawPaymentMethod);

        if (!VALID_STAFF_PAYMENT_METHODS.includes(paymentMethod)) {
            return errorResponse(
                res,
                "Hình thức thanh toán chỉ nhận tiền mặt hoặc VNPay.",
                400
            );
        }

        const period = parseReservationPeriod({ endAt, startAt });

        if (period.error) {
            return errorResponse(res, period.error, 400);
        }

        const quote = await hourlySlotReservationService.getReservationQuote({
            buildingId: buildingResult.buildingId,
            ...period,
        });
        const transactionRef = `HRG${Date.now()}S${req.user.id}`;
        const paymentUrl =
            paymentMethod === "VNPAY"
                ? createPaymentUrl({
                      amount: quote.amount,
                      bankCode,
                      clientIp: getClientIp(req),
                      locale,
                      orderInfo: `Thanh toán đặt ô cho xe ${String(
                          plateNumber
                      ).trim()}`,
                      transactionRef,
                  })
                : null;
        const result =
            await hourlySlotReservationService.createReservationWithPayment({
                ...period,
                ...quote,
                buildingId: buildingResult.buildingId,
                createdBy: req.user.id,
                customerType: "WALK_IN_GUEST",
                guestName: String(guestName).trim(),
                guestPhone: normalizedGuestPhone,
                note,
                paymentMethod,
                paymentUrl,
                plateNumber,
                slotId: Number(slotId),
                transactionRef,
            });
        const reservation =
            await hourlySlotReservationService.getReservationById(
                result.reservationId
            );
        let sms = null;

        if (result.smsOutboxId) {
            try {
                const deliveries = await smsService.processPendingSms({
                    ids: [result.smsOutboxId],
                    limit: 1,
                });

                sms = deliveries[0] || {
                    id: result.smsOutboxId,
                    status: "PENDING",
                };
            } catch (smsError) {
                sms = {
                    error: smsError.message,
                    id: result.smsOutboxId,
                    status: "FAILED",
                };
            }
        }

        return successResponse(
            res,
            paymentMethod === "CASH"
                ? "Đã thu tiền mặt và giữ ô cho khách."
                : "Đã tạo yêu cầu thanh toán VNPay để giữ ô cho khách.",
            {
                reservation,
                payment: {
                    amount: quote.amount,
                    id: result.paymentId,
                    paymentUrl,
                    provider: paymentMethod,
                    transactionRef,
                },
                sms,
            },
            201
        );
    } catch (error) {
        if (error.statusCode) {
            return errorResponse(res, error.message, error.statusCode);
        }

        return errorResponse(
            res,
            "Không thể tạo lượt đặt ô cho khách vãng lai.",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getMyReservations` (get my reservations). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyReservations
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyReservations = async (req, res) => {
    try {
        const reservations =
            await hourlySlotReservationService.getReservations({
                userId: req.user.id,
            });

        return successResponse(
            res,
            "Đã tải danh sách ô bạn đã đặt.",
            reservations
        );
    } catch (error) {
        return errorResponse(
            res,
            "Không thể tải danh sách ô đã đặt.",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getStaffReservations` (get staff reservations). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getStaffReservations
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getStaffReservations = async (req, res) => {
    try {
        const buildingResult = resolveBuildingId(req, req.query.buildingId);

        if (buildingResult.error) {
            return errorResponse(
                res,
                buildingResult.error,
                buildingResult.statusCode || 400
            );
        }

        const reservations =
            await hourlySlotReservationService.getReservations({
                buildingId: buildingResult.buildingId,
                status: req.query.status,
            });

        return successResponse(
            res,
            "Đã tải danh sách đặt ô của tòa nhà.",
            reservations
        );
    } catch (error) {
        return errorResponse(
            res,
            "Không thể tải danh sách đặt ô của tòa nhà.",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getCheckInMatch` (get check in match). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getCheckInMatch
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getCheckInMatch = async (req, res) => {
    try {
        const buildingResult = resolveBuildingId(req, req.query.buildingId);

        if (buildingResult.error) {
            return errorResponse(
                res,
                buildingResult.error,
                buildingResult.statusCode || 400
            );
        }

        const plateNumber = String(req.query.plateNumber || "").trim();

        if (!plateNumber) {
            return errorResponse(res, "Vui lòng nhập biển số xe.", 400);
        }

        const reservation =
            await hourlySlotReservationService.getReservationForCheckIn({
                buildingId: buildingResult.buildingId,
                plateNumber,
            });

        return successResponse(
            res,
            reservation
                ? "Đã tìm thấy lượt đặt ô đã thanh toán."
                : "Xe không có lượt đặt ô đang trong thời gian nhận xe.",
            reservation
        );
    } catch (error) {
        return errorResponse(
            res,
            "Không thể kiểm tra lượt đặt ô của xe.",
            500,
            error.message
        );
    }
};

module.exports = {
    createGuestReservation,
    createUserReservation,
    getAvailability,
    getCheckInMatch,
    getMyReservations,
    getStaffReservations,
};
