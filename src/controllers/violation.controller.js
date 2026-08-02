/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của violation.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `parkingSessionService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/violation.controller.js.
 */
const parkingSessionService = require("../services/parkingSession.service");
/**
 * Khai báo `violationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/violation.controller.js.
 */
const violationService = require("../services/violation.service");
/**
 * Khai báo `violationTypeService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/violation.controller.js.
 */
const violationTypeService = require("../services/violationType.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    VEHICLE_TYPES,
    VIOLATION_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseNonNegativeAmount` (parse non negative amount). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parseNonNegativeAmount
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parseNonNegativeAmount = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

/**
 * Kiểm tra nghiệp vụ `hasBodyValue` (has body value). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function hasBodyValue
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const hasBodyValue = (value) => {
    return value !== undefined && value !== null && value !== "";
};

/**
 * Tạo nghiệp vụ `createViolation` (create violation). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createViolation
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createViolation = async (req, res) => {
    try {
        const parkingSessionId = req.body.parkingSessionId;
        let session = null;

        if (parkingSessionId !== undefined && parkingSessionId !== null) {
            if (!isValidId(parkingSessionId)) {
                return errorResponse(res, "parkingSessionId khong hop le", 400);
            }

            session = await parkingSessionService.getSessionById(parkingSessionId);

            if (!session) {
                return errorResponse(res, "Khong tim thay phien gui xe", 404);
            }
        }

        const plateNumber = session
            ? session.plateNumber
            : typeof req.body.plateNumber === "string"
                ? req.body.plateNumber.trim().toUpperCase()
                : "";
        const vehicleType = session
            ? session.vehicleType
            : normalizeEnum(req.body.vehicleType);
        const violationTypeId = req.body.violationTypeId;
        let violationTypeRecord = null;
        let violationType =
            typeof req.body.violationType === "string"
                ? req.body.violationType.trim()
                : "";
        let penaltyFee = hasBodyValue(req.body.penaltyFee)
            ? parseNonNegativeAmount(req.body.penaltyFee)
            : null;
        const status = req.body.status ? normalizeEnum(req.body.status) : "OPEN";

        if (hasBodyValue(violationTypeId)) {
            if (!isValidId(violationTypeId)) {
                return errorResponse(res, "violationTypeId khong hop le", 400);
            }

            violationTypeRecord = await violationTypeService.getViolationTypeById(
                violationTypeId
            );

            if (!violationTypeRecord) {
                return errorResponse(res, "Khong tim thay loai vi pham", 404);
            }

            if (violationTypeRecord.status !== "ACTIVE") {
                return errorResponse(res, "Loai vi pham dang bi tat", 400);
            }

            violationType = violationTypeRecord.name;
            penaltyFee = parseNonNegativeAmount(
                violationTypeRecord.defaultPenaltyFee
            );
        }

        if (!plateNumber) {
            return errorResponse(res, "plateNumber khong duoc de trong", 400);
        }

        if (!isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
            return errorResponse(res, "vehicleType chi nhan MOTORBIKE hoac CAR", 400);
        }

        if (!violationType) {
            return errorResponse(
                res,
                "violationType hoac violationTypeId khong duoc de trong",
                400
            );
        }

        if (penaltyFee === null) {
            return errorResponse(res, "penaltyFee phai la so nguyen khong am", 400);
        }

        if (!isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        const vehicle = session?.vehicleId
            ? null
            : await parkingSessionService.getVehicleByPlateNumber(plateNumber);

        const violation = await violationService.createViolation({
            detectedAt: req.body.detectedAt,
            evidenceUrl: req.body.evidenceUrl,
            note: req.body.note,
            parkingSessionId: session?.id || null,
            penaltyFee,
            plateNumber,
            staffId: req.user.id,
            status,
            vehicleId: session?.vehicleId || vehicle?.id || null,
            vehicleType,
            violationType,
            violationTypeId: violationTypeRecord?.id || null,
        });

        return successResponse(res, "Ghi nhan vi pham thanh cong", violation, 201);
    } catch (error) {
        return errorResponse(res, "Loi ghi nhan vi pham", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getViolations` (get violations). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getViolations
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolations = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const vehicleType = req.query.vehicleType
            ? normalizeEnum(req.query.vehicleType)
            : undefined;
        const plateNumber =
            typeof req.query.plateNumber === "string"
                ? req.query.plateNumber.trim().toUpperCase()
                : undefined;
        const parkingSessionId = req.query.parkingSessionId;

        if (status && !isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        if (vehicleType && !isValidEnumValue(VEHICLE_TYPES, vehicleType)) {
            return errorResponse(res, "vehicleType khong hop le", 400);
        }

        if (parkingSessionId && !isValidId(parkingSessionId)) {
            return errorResponse(res, "parkingSessionId khong hop le", 400);
        }

        const violations = await violationService.getViolations({
            from: req.query.from,
            parkingSessionId,
            plateNumber,
            status,
            to: req.query.to,
            vehicleType,
        });

        return successResponse(res, "Lay danh sach vi pham thanh cong", violations);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach vi pham", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getViolationById` (get violation by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getViolationById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation id khong hop le", 400);
        }

        const violation = await violationService.getViolationById(req.params.id);

        if (!violation) {
            return errorResponse(res, "Khong tim thay vi pham", 404);
        }

        return successResponse(res, "Lay chi tiet vi pham thanh cong", violation);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet vi pham", 500, error.message);
    }
};

/**
 * Cập nhật nghiệp vụ `updateViolationStatus` (update violation status). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateViolationStatus
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateViolationStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation id khong hop le", 400);
        }

        const status = normalizeEnum(req.body.status);

        if (!isValidEnumValue(VIOLATION_STATUSES, status)) {
            return errorResponse(res, "status vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_STATUSES),
            });
        }

        const existing = await violationService.getViolationById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay vi pham", 404);
        }

        const violation = await violationService.updateViolationStatus({
            id: req.params.id,
            note: req.body.note,
            status,
        });

        return successResponse(res, "Cap nhat trang thai vi pham thanh cong", violation);
    } catch (error) {
        return errorResponse(
            res,
            "Loi cap nhat trang thai vi pham",
            500,
            error.message
        );
    }
};

module.exports = {
    createViolation,
    getViolationById,
    getViolations,
    updateViolationStatus,
};
