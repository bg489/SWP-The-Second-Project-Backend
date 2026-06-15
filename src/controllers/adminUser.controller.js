const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    ROLES,
    USER_STATUSES,
    normalizeEnum,
    isValidEnumValue,
} = require("../utils/constants");

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

const updateUserRoleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const role = normalizeEnum(req.body.role);
        const status = normalizeEnum(req.body.status);

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "User id không hợp lệ", 400);
        }

        if (!role || !isValidEnumValue(ROLES, role)) {
            return errorResponse(res, "Role không hợp lệ", 400, {
                allowedRoles: Object.values(ROLES),
            });
        }

        if (!status || !isValidEnumValue(USER_STATUSES, status)) {
            return errorResponse(res, "User status không hợp lệ", 400, {
                allowedStatuses: Object.values(USER_STATUSES),
            });
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        if (Number(id) === Number(req.user.id) && status !== USER_STATUSES.ACTIVE) {
            return errorResponse(res, "Admin không thể tự khóa hoặc vô hiệu hóa tài khoản của mình", 400);
        }

        const updatedUser = await userService.updateUserRoleStatus({
            id,
            role,
            status,
        });

        return successResponse(res, "Cập nhật role/trạng thái user thành công", updatedUser);
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật role/trạng thái user", 500, error.message);
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
    getUsers,
    getUserById,
    updateUserRoleStatus,
    lockUser,
    unlockUser,
    updateUserBuilding,
};
