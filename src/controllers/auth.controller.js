const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/response");
const emailService = require("../services/email.service");
const passwordResetService = require("../services/passwordReset.service");
const userService = require("../services/user.service");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

const PHONE_REGEX = /^0\d{9}$/;

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

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isValidPhone = (phone) => {
    if (!phone) {
        return true;
    }

    return PHONE_REGEX.test(String(phone).trim());
};

const register = async (req, res) => {
    try {
        const { name, email, phone, password, buildingId } = req.body;

        if (!name || !email || !password) {
            return errorResponse(res, "Vui lòng nhập họ tên, email và mật khẩu.", 400);
        }

        if (password.length < 6) {
            return errorResponse(res, "Mật khẩu phải có ít nhất 6 ký tự.", 400);
        }

        if (!isValidPhone(phone)) {
            return errorResponse(
                res,
                "Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng 0.",
                400
            );
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = phone ? String(phone).trim() : null;
        const existedUser = await userService.findExistingUserForRegister(
            normalizedEmail,
            normalizedPhone
        );

        if (existedUser) {
            return errorResponse(res, "Email hoặc số điện thoại đã tồn tại.", 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await userService.createUser({
            name: String(name).trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            passwordHash,
            buildingId,
        });

        return successResponse(res, "Đăng ký tài khoản thành công.", newUser, 201);
    } catch (error) {
        return errorResponse(res, "Lỗi đăng ký tài khoản.", 500, error.message);
    }
};

const login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return errorResponse(res, "Vui lòng nhập email hoặc số điện thoại và mật khẩu.", 400);
        }

        const user = await userService.findUserByEmailOrPhone(emailOrPhone);

        if (!user) {
            return errorResponse(res, "Email, số điện thoại hoặc mật khẩu không đúng.", 401);
        }

        if (user.status !== USER_STATUSES.ACTIVE) {
            return errorResponse(
                res,
                "Tài khoản đã bị khóa hoặc chưa được duyệt.",
                403,
                { status: user.status }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return errorResponse(res, "Email, số điện thoại hoặc mật khẩu không đúng.", 401);
        }

        const token = generateToken(user);

        return successResponse(res, "Đăng nhập thành công.", {
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
                emailNotificationsEnabled: Boolean(user.email_notifications_enabled ?? true),
            },
        });
    } catch (error) {
        return errorResponse(res, "Lỗi đăng nhập.", 500, error.message);
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return errorResponse(res, "Vui lòng nhập email.", 400);
        }

        const user = await userService.findUserByEmail(email);

        if (!user) {
            return successResponse(res, "Nếu email tồn tại, hệ thống sẽ gửi hướng dẫn đổi mật khẩu.");
        }

        const resetRequest = await passwordResetService.createResetRequest({
            userId: user.id,
        });
        const resetUrl = `${emailService.getFrontendUrl()}/login?mode=reset&email=${encodeURIComponent(email)}&token=${resetRequest.token}`;
        const html = emailService.buildParkingMail({
            actionLabel: "Đổi mật khẩu",
            body: `Xin chào ${user.name || "bạn"}, hệ thống nhận được yêu cầu đổi mật khẩu cho tài khoản Sunrise Parking. Bạn có thể bấm nút bên dưới hoặc nhập mã OTP trong màn hình đăng nhập.`,
            buttonLabel: "Mở trang đổi mật khẩu",
            buttonUrl: resetUrl,
            otp: resetRequest.otp,
            title: "Xác minh đổi mật khẩu",
        });

        await emailService.sendMail({
            html,
            subject: "Sunrise Parking - Xác minh đổi mật khẩu",
            text: `OTP đổi mật khẩu của bạn là ${resetRequest.otp}. Link: ${resetUrl}. Mã hết hạn sau ${resetRequest.expiresMinutes} phút.`,
            to: email,
        });

        return successResponse(res, "Đã gửi hướng dẫn đổi mật khẩu tới email của bạn.");
    } catch (error) {
        return errorResponse(res, "Lỗi gửi yêu cầu đổi mật khẩu.", 500, error.message);
    }
};

const verifyPasswordReset = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
        const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

        if (!email || (!token && !otp)) {
            return errorResponse(res, "Vui lòng nhập email và mã xác minh.", 400);
        }

        const resetRequest = await passwordResetService.findValidResetRequest({
            email,
            otp,
            token,
        });

        if (!resetRequest) {
            return errorResponse(res, "Mã xác minh không đúng hoặc đã hết hạn.", 400);
        }

        return successResponse(res, "Mã xác minh hợp lệ.");
    } catch (error) {
        return errorResponse(res, "Lỗi kiểm tra mã xác minh.", 500, error.message);
    }
};

const resetPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
        const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
        const password = String(req.body.password || "");

        if (!email || (!token && !otp)) {
            return errorResponse(res, "Vui lòng nhập email và mã xác minh.", 400);
        }

        if (password.length < 6) {
            return errorResponse(res, "Mật khẩu mới phải có ít nhất 6 ký tự.", 400);
        }

        const resetRequest = await passwordResetService.findValidResetRequest({
            email,
            otp,
            token,
        });

        if (!resetRequest) {
            return errorResponse(res, "Mã xác minh không đúng hoặc đã hết hạn.", 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await userService.updateUserPassword({
            id: resetRequest.userId,
            passwordHash,
        });
        await passwordResetService.markResetRequestUsed(resetRequest.id);

        return successResponse(res, "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
    } catch (error) {
        return errorResponse(res, "Lỗi đổi mật khẩu.", 500, error.message);
    }
};

const refresh = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy người dùng.", 404);
        }

        const token = generateToken(user);

        return successResponse(res, "Làm mới đăng nhập thành công.", {
            token,
            user,
        });
    } catch (error) {
        return errorResponse(res, "Lỗi làm mới đăng nhập.", 500, error.message);
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy người dùng.", 404);
        }

        const vehicles = await userService.getVehiclesByUserId(req.user.id);

        return successResponse(res, "Lấy thông tin người dùng hiện tại thành công.", {
            ...user,
            vehicleCount: vehicles.length,
            vehicles,
        });
    } catch (error) {
        return errorResponse(res, "Lỗi lấy thông tin người dùng hiện tại.", 500, error.message);
    }
};

module.exports = {
    register,
    login,
    requestPasswordReset,
    verifyPasswordReset,
    resetPassword,
    refresh,
    getCurrentUser,
};
