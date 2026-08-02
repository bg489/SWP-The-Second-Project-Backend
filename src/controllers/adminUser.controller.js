const bcrypt = require("bcryptjs");

const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    ROLES,
    USER_STATUSES,
    normalizeEnum,
    isValidEnumValue,
} = require("../utils/constants");
const { isValidVietnamPhone, normalizeOptionalPhone } = require("../utils/phone");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidPortrait = (value) => {
    if (typeof value !== "string" || value.length < 50 || value.length > 1_200_000) {
        return false;
    }

    return /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
        || /^https:\/\//i.test(value);
};

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
