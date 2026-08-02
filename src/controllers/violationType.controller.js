/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của violationType.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `violationTypeService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/violationType.controller.js.
 */
const violationTypeService = require("../services/violationType.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    VIOLATION_TYPE_STATUSES,
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
 * Kiểm tra nghiệp vụ `validatePayload` (validate payload). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function validatePayload
 * @param {*} body - Giá trị `body` được hàm sử dụng trong quá trình xử lý.
 * @param {*} existing - Giá trị `existing` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const validatePayload = (body, existing = {}) => {
    const name =
        body.name === undefined ? existing.name : String(body.name || "").trim();
    const defaultPenaltyFee =
        body.defaultPenaltyFee === undefined
            ? Number(existing.defaultPenaltyFee)
            : parseNonNegativeAmount(body.defaultPenaltyFee);
    const status = normalizeEnum(body.status || existing.status || "ACTIVE");
    const description =
        body.description === undefined
            ? existing.description
            : String(body.description || "").trim();

    if (!name) {
        return { error: "name khong duoc de trong" };
    }

    if (defaultPenaltyFee === null) {
        return { error: "defaultPenaltyFee phai la so nguyen khong am" };
    }

    if (!isValidEnumValue(VIOLATION_TYPE_STATUSES, status)) {
        return {
            error: "status loai vi pham chi nhan ACTIVE hoac INACTIVE",
        };
    }

    return {
        value: {
            defaultPenaltyFee,
            description: description || null,
            name,
            status,
        },
    };
};

/**
 * Tạo nghiệp vụ `createViolationType` (create violation type). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createViolationType
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createViolationType = async (req, res) => {
    try {
        const validation = validatePayload(req.body);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const violationType = await violationTypeService.createViolationType({
            ...validation.value,
            createdBy: req.user.id,
        });

        return successResponse(
            res,
            "Tao loai vi pham thanh cong",
            violationType,
            201
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten loai vi pham da ton tai", 400);
        }

        return errorResponse(res, "Loi tao loai vi pham", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getViolationTypes` (get violation types). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getViolationTypes
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationTypes = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const q =
            typeof req.query.q === "string" ? req.query.q.trim() : undefined;

        if (status && !isValidEnumValue(VIOLATION_TYPE_STATUSES, status)) {
            return errorResponse(res, "status loai vi pham khong hop le", 400, {
                allowedStatuses: Object.values(VIOLATION_TYPE_STATUSES),
            });
        }

        const violationTypes = await violationTypeService.getViolationTypes({
            q,
            status,
        });

        return successResponse(
            res,
            "Lay danh sach loai vi pham thanh cong",
            violationTypes
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach loai vi pham",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getViolationTypeById` (get violation type by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getViolationTypeById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationTypeById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const violationType = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!violationType) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        return successResponse(
            res,
            "Lay chi tiet loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay chi tiet loai vi pham",
            500,
            error.message
        );
    }
};

/**
 * Cập nhật nghiệp vụ `updateViolationType` (update violation type). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateViolationType
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateViolationType = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const existing = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!existing) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        const validation = validatePayload(req.body, existing);

        if (validation.error) {
            return errorResponse(res, validation.error, 400);
        }

        const violationType = await violationTypeService.updateViolationType({
            id: req.params.id,
            ...validation.value,
        });

        return successResponse(
            res,
            "Cap nhat loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten loai vi pham da ton tai", 400);
        }

        return errorResponse(
            res,
            "Loi cap nhat loai vi pham",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `deactivateViolationType` (deactivate violation type). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deactivateViolationType
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deactivateViolationType = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Violation type id khong hop le", 400);
        }

        const existing = await violationTypeService.getViolationTypeById(
            req.params.id
        );

        if (!existing) {
            return errorResponse(res, "Khong tim thay loai vi pham", 404);
        }

        const violationType = await violationTypeService.deactivateViolationType(
            req.params.id
        );

        return successResponse(
            res,
            "Tat loai vi pham thanh cong",
            violationType
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi tat loai vi pham",
            500,
            error.message
        );
    }
};

module.exports = {
    createViolationType,
    deactivateViolationType,
    getViolationTypeById,
    getViolationTypes,
    updateViolationType,
};
