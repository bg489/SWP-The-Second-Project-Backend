const authController = require("./auth.controller");
const userService = require("../services/user.service");
const { ROLES, AUTHENTICATED_ROLES } = require("../constants/roles");
const { successResponse, errorResponse } = require("../utils/response");

const BUSINESS_ROLES = [
    {
        role: ROLES.ADMIN,
        accountRole: true,
        description: "Duyet tai khoan/xe va gan role cho tai khoan.",
    },
    {
        role: ROLES.MANAGER,
        accountRole: true,
        description: "Cau hinh toa nha, tang, suc chua, slot oto, gia va bao cao.",
    },
    {
        role: ROLES.STAFF,
        accountRole: true,
        description: "Van hanh cong, quet QR, nhap bien so, xu ly vao/ra va vi pham.",
    },
    {
        role: ROLES.USER,
        accountRole: true,
        description: "Dang ky xe, mua goi thang hoac gui theo phien.",
    },
    {
        role: "WALK_IN_GUEST",
        accountRole: false,
        description: "Khach vang lai khong can tai khoan, dung QR/session card tam.",
    },
];

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const getAvailableRoles = async (req, res) => {
    return successResponse(res, "Lay danh sach vai tro thanh cong", {
        accountRoles: AUTHENTICATED_ROLES,
        businessRoles: BUSINESS_ROLES,
    });
};

const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();

        return successResponse(res, "Lay danh sach user thanh cong", users);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach user", 500, error.message);
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "User id khong hop le", 400);
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Khong tim thay user", 404);
        }

        return successResponse(res, "Lay chi tiet user thanh cong", user);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet user", 500, error.message);
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = typeof req.body.role === "string" ? req.body.role.trim().toUpperCase() : "";

        if (!isValidId(id)) {
            return errorResponse(res, "User id khong hop le", 400);
        }

        if (!AUTHENTICATED_ROLES.includes(role)) {
            return errorResponse(
                res,
                `Role khong hop le. Chi nhan: ${AUTHENTICATED_ROLES.join(", ")}`,
                400
            );
        }

        const user = await userService.getUserById(id);

        if (!user) {
            return errorResponse(res, "Khong tim thay user", 404);
        }

        const updatedUser = await userService.updateUserRole(id, role);

        return successResponse(res, "Cap nhat role user thanh cong", {
            ...updatedUser,
            note: "User can dang nhap lai de JWT token nhan role moi.",
        });
    } catch (error) {
        return errorResponse(res, "Loi cap nhat role user", 500, error.message);
    }
};

module.exports = {
    getCurrentUser: authController.getCurrentUser,
    getAvailableRoles,
    getAllUsers,
    getUserById,
    updateUserRole,
};
