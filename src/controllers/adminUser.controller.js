/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của adminUser.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/adminUser.controller.js.
 */
const bcrypt = require("bcryptjs");

/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/adminUser.controller.js.
 */
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    ROLES,
    USER_STATUSES,
    normalizeEnum,
    isValidEnumValue,
} = require("../utils/constants");
const { isValidVietnamPhone, normalizeOptionalPhone } = require("../utils/phone");

/**
 * Khai báo `EMAIL_REGEX` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/controllers/adminUser.controller.js.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Kiểm tra nghiệp vụ `isValidPortrait` (is valid portrait). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidPortrait
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidPortrait = (value) => {
    if (typeof value !== "string" || value.length < 50 || value.length > 1_200_000) {
        return false;
    }

    return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
        || /^https:\/\//i.test(value);
};

/**
 * Tạo nghiệp vụ `createUser` (create user). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createUser
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createUser = async (req, res) => {
    try {
        const {
            buildingId,
            email,
            name,
            password,
            phone,
            portraitImageUrl,
            role: rawRole,
        } = req.body || {};
        const normalizedName = String(name || "").trim();
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedPhone = normalizeOptionalPhone(phone);
        const normalizedRole = normalizeEnum(rawRole);
        const normalizedPassword = String(password || "");
        const accountNeedsBuilding = [ROLES.USER, ROLES.STAFF].includes(normalizedRole);

        if (normalizedName.length < 2 || normalizedName.length > 100) {
            return errorResponse(res, "Họ tên phải có từ 2 đến 100 ký tự", 400);
        }

        if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 150) {
            return errorResponse(res, "Email không hợp lệ", 400);
        }

        if (!isValidVietnamPhone(normalizedPhone)) {
            return errorResponse(res, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0", 400);
        }

        if (normalizedPassword.length < 6 || normalizedPassword.length > 72) {
            return errorResponse(res, "Mật khẩu phải có từ 6 đến 72 ký tự", 400);
        }

        if (!normalizedRole || !isValidEnumValue(ROLES, normalizedRole)) {
            return errorResponse(res, "Vai trò tài khoản không hợp lệ", 400, {
                allowedRoles: Object.values(ROLES),
            });
        }

        if (accountNeedsBuilding && (!Number.isInteger(Number(buildingId)) || Number(buildingId) <= 0)) {
            return errorResponse(res, "Tài khoản User và Staff phải được gán một tòa nhà", 400);
        }

        if (normalizedRole === ROLES.STAFF && !isValidPortrait(portraitImageUrl)) {
            return errorResponse(res, "Tài khoản Staff phải có ảnh chân dung hợp lệ", 400);
        }

        const passwordHash = await bcrypt.hash(normalizedPassword, 10);
        const user = await userService.createAdminManagedUser({
            adminId: req.user.id,
            buildingId: accountNeedsBuilding ? Number(buildingId) : null,
            email: normalizedEmail,
            name: normalizedName,
            passwordHash,
            phone: normalizedPhone,
            portraitImageUrl: normalizedRole === ROLES.STAFF ? portraitImageUrl : null,
            role: normalizedRole,
        });

        return successResponse(
            res,
            `Đã tạo tài khoản ${normalizedRole} và kích hoạt ngay`,
            user,
            201
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Tạo tài khoản thất bại",
            error.statusCode || 500
        );
    }
};

/**
 * Lấy nghiệp vụ `getUsers` (get users). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getUsers
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getUsers = async (req, res) => {
    try {
        const role = req.query.role ? normalizeEnum(req.query.role) : undefined;
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;

        if (role && !isValidEnumValue(ROLES, role)) {
            return errorResponse(res, "Role không hợp lệ", 400, {
                allowedRoles: Object.values(ROLES),
            });
        }

        if (status && !isValidEnumValue(USER_STATUSES, status)) {
            return errorResponse(res, "User status không hợp lệ", 400, {
                allowedStatuses: Object.values(USER_STATUSES),
            });
        }

        const result = await userService.getUsers({
            q: req.query.q,
            role,
            status,
            page: req.query.page,
            limit: req.query.limit,
        });

        return successResponse(res, "Lấy danh sách user thành công", result);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách user", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getUserById` (get user by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getUserById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "User id không hợp lệ", 400);
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        const vehicles = await userService.getVehiclesByUserId(id);

        return successResponse(res, "Lấy chi tiết user thành công", {
            ...user,
            vehicleCount: vehicles.length,
            vehicles,
        });
    } catch (error) {
        return errorResponse(res, "Lỗi lấy chi tiết user", 500, error.message);
    }
};

/**
 * Thực hiện nghiệp vụ `lockUser` (lock user). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function lockUser
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const lockUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "User id không hợp lệ", 400);
        }

        if (Number(id) === Number(req.user.id)) {
            return errorResponse(res, "Admin không thể tự khóa tài khoản của mình", 400);
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        const updatedUser = await userService.updateUserStatus({
            id,
            status: USER_STATUSES.LOCKED,
        });

        return successResponse(res, "Khóa tài khoản user thành công", updatedUser);
    } catch (error) {
        return errorResponse(res, "Lỗi khóa tài khoản user", 500, error.message);
    }
};

/**
 * Thực hiện nghiệp vụ `unlockUser` (unlock user). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function unlockUser
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const unlockUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "User id không hợp lệ", 400);
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        const updatedUser = await userService.updateUserStatus({
            id,
            status: USER_STATUSES.ACTIVE,
        });

        return successResponse(res, "Mở khóa tài khoản user thành công", updatedUser);
    } catch (error) {
        return errorResponse(res, "Lỗi mở khóa tài khoản user", 500, error.message);
    }
};

/**
 * Cập nhật nghiệp vụ `updateUserBuilding` (update user building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateUserBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateUserBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const { buildingId } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return errorResponse(res, "User id khong hop le", 400);
        }

        if (!Number.isInteger(Number(buildingId)) || Number(buildingId) <= 0) {
            return errorResponse(res, "buildingId khong hop le", 400);
        }

        const updatedUser = await userService.updateUserBuilding({
            id: Number(id),
            buildingId: Number(buildingId),
        });

        return successResponse(
            res,
            "Cap nhat toa nha cua user thanh cong",
            updatedUser
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Loi cap nhat toa nha cua user",
            error.statusCode || 500
        );
    }
};

module.exports = {
    createUser,
    getUsers,
    getUserById,
    lockUser,
    unlockUser,
    updateUserBuilding,
};
