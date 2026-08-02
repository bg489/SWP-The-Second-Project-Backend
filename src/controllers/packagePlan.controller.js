/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của packagePlan.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
/**
 * Khai báo `packagePlanService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/packagePlan.controller.js.
 */
const packagePlanService = require("../services/packagePlan.service");
/**
 * Khai báo `monthlyPassService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/packagePlan.controller.js.
 */
const monthlyPassService = require("../services/monthlyPass.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    PACKAGE_PLAN_STATUSES,
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
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parsePositiveInteger` (parse positive integer). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parsePositiveInteger
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parsePositiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `formatSqlDate` (format sql date). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function formatSqlDate
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const formatSqlDate = (date) => date.toISOString().slice(0, 10);

/**
 * Tạo nghiệp vụ `addDays` (add days). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function addDays
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @param {*} days - Giá trị `days` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const addDays = (date, days) => {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
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

/**
 * Tạo nghiệp vụ `createPackagePlan` (create package plan). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createPackagePlan
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getPackagePlans` (get package plans). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getPackagePlans
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getPackagePlanById` (get package plan by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getPackagePlanById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updatePackagePlan` (update package plan). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updatePackagePlan
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `deactivatePackagePlan` (deactivate package plan). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deactivatePackagePlan
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `buyPackagePlan` (buy package plan). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function buyPackagePlan
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
