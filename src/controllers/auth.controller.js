const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/response");
const userService = require("../services/user.service");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: normalizeRole(user.role),
            status: user.status,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
    );
};

const register = async (req, res) => {
    try {
        const { name, email, phone, password, buildingId } = req.body;

        if (!name || !email || !password) {
            return errorResponse(res, "Vui lòng nhập name, email và password", 400);
        }

        if (password.length < 6) {
            return errorResponse(res, "Password phải có ít nhất 6 ký tự", 400);
        }

        const existedUser = await userService.findExistingUserForRegister(email, phone);

        if (existedUser) {
            return errorResponse(res, "Email hoặc phone đã tồn tại", 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await userService.createUser({
            name,
            email,
            phone,
            passwordHash,
            buildingId,
        });

        return successResponse(res, "Đăng ký tài khoản thành công", newUser, 201);
    } catch (error) {
        return errorResponse(res, "Lỗi đăng ký tài khoản", 500, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return errorResponse(res, "Vui lòng nhập email/phone và password", 400);
        }

        const user = await userService.findUserByEmailOrPhone(emailOrPhone);

        if (!user) {
            return errorResponse(res, "Email/phone hoặc password không đúng", 401);
        }

        if (user.status !== USER_STATUSES.ACTIVE) {
            return errorResponse(
                res,
                "Tài khoản đã bị khóa hoặc không còn hoạt động",
                403,
                { status: user.status }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return errorResponse(res, "Email/phone hoặc password không đúng", 401);
        }

        const token = generateToken(user);

        return successResponse(res, "Đăng nhập thành công", {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: normalizeRole(user.role),
                status: user.status,
                buildingId: user.building_id,
                avatarUrl: user.avatar_url,
            },
        });
    } catch (error) {
        return errorResponse(res, "Lỗi đăng nhập", 500, error.message);
    }
};

const refresh = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Khong tim thay user", 404);
        }

        const token = generateToken(user);

        return successResponse(res, "Lam moi dang nhap thanh cong", {
            token,
            user,
        });
    } catch (error) {
        return errorResponse(res, "Loi lam moi dang nhap", 500, error.message);
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        const vehicles = await userService.getVehiclesByUserId(req.user.id);

        return successResponse(res, "Lấy thông tin user hiện tại thành công", {
            ...user,
            vehicleCount: vehicles.length,
            vehicles,
        });
    } catch (error) {
        return errorResponse(res, "Lỗi lấy thông tin user hiện tại", 500, error.message);
    }
};

module.exports = {
    register,
    login,
    refresh,
    getCurrentUser,
};
