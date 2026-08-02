/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của qrPass.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `qrPassService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/qrPass.controller.js.
 */
const qrPassService = require("../services/qrPass.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/qrPass.controller.js.
 */
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    QR_PASS_STATUSES,
    QR_PASS_TYPES,
    ROLES,
    isValidEnumValue,
    normalizeEnum,
    normalizeRole,
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
 * Kiểm tra nghiệp vụ `hasElevatedRole` (has elevated role). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function hasElevatedRole
 * @param {*} role - Giá trị `role` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const hasElevatedRole = (role) => {
    const normalizedRole = normalizeRole(role);
    return [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF].includes(normalizedRole);
};

/**
 * Lấy nghiệp vụ `getQrPasses` (get qr passes). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getQrPasses
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPasses = async (req, res) => {
    try {
        const passType = req.query.passType ? normalizeEnum(req.query.passType) : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const buildingId = req.query.buildingId;
        const vehicleId = req.query.vehicleId;
        const normalizedBuildingId = isValidId(buildingId) ? buildingId : undefined;

        await qrPassService.ensureQrPassesForManagement({
            buildingId: normalizedBuildingId,
            createdBy: req.user.id,
        });

        const qrPasses = await qrPassService.getQrPasses({
            buildingId: normalizedBuildingId,
            passType,
            status,
            vehicleId: isValidId(vehicleId) ? vehicleId : undefined,
        });

        return successResponse(res, "Lấy danh sách mã QR thành công", qrPasses);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách mã QR", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMyQrPasses` (get my qr passes). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyQrPasses
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyQrPasses = async (req, res) => {
    try {
        await qrPassService.ensureQrPassesForUser(req.user.id);

        const qrPasses = await qrPassService.getQrPasses({
            userId: req.user.id,
        });
        const currentUser = await userService.getUserById(req.user.id);
        const currentBuildingId = currentUser?.buildingId;
        const visibleQrPasses = currentBuildingId
            ? qrPasses.filter(
                  /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
                  (qrPass) =>
                      !qrPass.buildingId ||
                      Number(qrPass.buildingId) === Number(currentBuildingId)
              )
            : qrPasses;

        return successResponse(res, "Lấy danh sách mã QR của tôi thành công", visibleQrPasses);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách mã QR của tôi", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getQrPassById` (get qr pass by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getQrPassById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "QR pass id khong hop le", 400);
        }

        const qrPass = await qrPassService.getQrPassById(req.params.id);

        if (!qrPass) {
            return errorResponse(res, "Khong tim thay QR pass", 404);
        }

        if (!hasElevatedRole(req.user.role) && qrPass.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen xem QR pass nay", 403);
        }

        return successResponse(res, "Lay chi tiet QR pass thanh cong", qrPass);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet QR pass", 500, error.message);
    }
};

/**
 * Tạo nghiệp vụ `createQrPassForMonthlyPass` (create qr pass for monthly pass). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createQrPassForMonthlyPass
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createQrPassForMonthlyPass = async (req, res) => {
    try {
        if (!isValidId(req.params.monthlyPassId)) {
            return errorResponse(res, "monthlyPassId khong hop le", 400);
        }

        const monthlyPass = await qrPassService.getMonthlyPassForQr(
            req.params.monthlyPassId
        );

        if (!monthlyPass) {
            return errorResponse(res, "Khong tim thay the thang", 404);
        }

        if (!hasElevatedRole(req.user.role) && monthlyPass.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen tao QR cho the nay", 403);
        }

        const qrPass = await qrPassService.createQrPassForMonthlyPass({
            createdBy: req.user.id,
            monthlyPassId: req.params.monthlyPassId,
            note: req.body.note,
        });

        return successResponse(res, "Tao QR pass the thang thanh cong", qrPass, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi tao QR pass the thang",
            error.statusCode || 500,
            error.statusCode ? null : error.message
        );
    }
};

/**
 * Tạo nghiệp vụ `createQrPassForSlotRegistration` (create qr pass for slot registration). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createQrPassForSlotRegistration
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createQrPassForSlotRegistration = async (req, res) => {
    try {
        if (!isValidId(req.params.slotRegistrationId)) {
            return errorResponse(res, "slotRegistrationId khong hop le", 400);
        }

        const registration = await qrPassService.getSlotRegistrationForQr(
            req.params.slotRegistrationId
        );

        if (!registration) {
            return errorResponse(res, "Khong tim thay dang ky slot", 404);
        }

        if (!hasElevatedRole(req.user.role) && registration.userId !== req.user.id) {
            return errorResponse(res, "Khong co quyen tao QR cho dang ky slot nay", 403);
        }

        const qrPass = await qrPassService.createQrPassForSlotRegistration({
            createdBy: req.user.id,
            note: req.body.note,
            slotRegistrationId: req.params.slotRegistrationId,
        });

        return successResponse(res, "Tao QR pass dang ky slot thanh cong", qrPass, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi tao QR pass dang ky slot",
            error.statusCode || 500,
            error.statusCode ? null : error.message
        );
    }
};

/**
 * Kiểm tra nghiệp vụ `validateQrPass` (validate qr pass). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function validateQrPass
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const validateQrPass = async (req, res) => {
    try {
        const qrCode =
            typeof req.body.qrCode === "string" ? req.body.qrCode.trim() : "";

        if (!qrCode) {
            return errorResponse(res, "qrCode khong duoc de trong", 400);
        }

        const result = await qrPassService.validateQrPass(qrCode, {
            buildingId: req.body.buildingId,
        });

        return successResponse(
            res,
            result.isValid ? "QR pass hop le" : "QR pass khong hop le",
            result
        );
    } catch (error) {
        return errorResponse(res, "Loi validate QR pass", 500, error.message);
    }
};

/**
 * Cập nhật nghiệp vụ `updateQrPassStatus` (update qr pass status). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateQrPassStatus
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateQrPassStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "QR pass id khong hop le", 400);
        }

        const status = normalizeEnum(req.body.status);

        if (!isValidEnumValue(QR_PASS_STATUSES, status)) {
            return errorResponse(res, "status QR khong hop le", 400, {
                allowedStatuses: Object.values(QR_PASS_STATUSES),
            });
        }

        const existing = await qrPassService.getQrPassById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay QR pass", 404);
        }

        const qrPass = await qrPassService.updateQrPassStatus({
            id: req.params.id,
            note: req.body.note,
            status,
        });

        return successResponse(res, "Cap nhat trang thai QR pass thanh cong", qrPass);
    } catch (error) {
        return errorResponse(
            res,
            "Loi cap nhat trang thai QR pass",
            500,
            error.message
        );
    }
};

/**
 * Kiểm tra nghiệp vụ `validateFilters` (validate filters). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function validateFilters
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @param {*} next - Hàm chuyển quyền xử lý sang middleware kế tiếp.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const validateFilters = (req, res, next) => {
    const passType = req.query.passType ? normalizeEnum(req.query.passType) : undefined;
    const status = req.query.status ? normalizeEnum(req.query.status) : undefined;

    if (passType && !isValidEnumValue(QR_PASS_TYPES, passType)) {
        return errorResponse(res, "passType QR khong hop le", 400, {
            allowedPassTypes: Object.values(QR_PASS_TYPES),
        });
    }

    if (status && !isValidEnumValue(QR_PASS_STATUSES, status)) {
        return errorResponse(res, "status QR khong hop le", 400, {
            allowedStatuses: Object.values(QR_PASS_STATUSES),
        });
    }

    return next();
};

module.exports = {
    createQrPassForMonthlyPass,
    createQrPassForSlotRegistration,
    getMyQrPasses,
    getQrPassById,
    getQrPasses,
    updateQrPassStatus,
    validateFilters,
    validateQrPass,
};
