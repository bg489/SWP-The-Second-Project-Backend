/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của pricingPolicy.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `pricingPolicyService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/pricingPolicy.controller.js.
 */
const pricingPolicyService = require("../services/pricingPolicy.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    PACKAGE_PLAN_STATUSES,
    PRICING_TYPES,
    VEHICLE_TYPES,
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
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parsePositiveAmount` (parse positive amount). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parsePositiveAmount
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parsePositiveAmount = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
    const buildingId =
        body.buildingId === undefined
            ? existing.buildingId || null
            : body.buildingId
              ? Number(body.buildingId)
              : null;
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
            buildingId,
            description: description || null,
            pricingType,
            status,
            vehicleType,
        },
    };
};

/**
 * Tạo nghiệp vụ `createPricingPolicy` (create pricing policy). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createPricingPolicy
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getPricingPolicies` (get pricing policies). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getPricingPolicies
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getPricingPolicies = async (req, res) => {
    try {
        const vehicleType = req.query.vehicleType
            ? normalizeEnum(req.query.vehicleType)
            : undefined;
        const pricingType = req.query.pricingType
            ? normalizeEnum(req.query.pricingType)
            : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const buildingId = req.query.buildingId ? Number(req.query.buildingId) : undefined;

        const pricingPolicies = await pricingPolicyService.getPricingPolicies({
            buildingId,
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

/**
 * Lấy nghiệp vụ `getPricingPolicyById` (get pricing policy by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getPricingPolicyById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updatePricingPolicy` (update pricing policy). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updatePricingPolicy
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `deactivatePricingPolicy` (deactivate pricing policy). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deactivatePricingPolicy
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
