/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của auth.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `crypto` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const crypto = require("crypto");
/**
 * Khai báo `jwt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/response");
/**
 * Khai báo `emailService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const emailService = require("../services/email.service");
/**
 * Khai báo `googleIdentityService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const googleIdentityService = require("../services/googleIdentity.service");
/**
 * Khai báo `passwordResetService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const passwordResetService = require("../services/passwordReset.service");
/**
 * Khai báo `registrationVerificationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const registrationVerificationService = require("../services/registrationVerification.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/auth.controller.js.
 */
const userService = require("../services/user.service");
const { isValidVietnamPhone, normalizeOptionalPhone } = require("../utils/phone");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

/**
 * Thực hiện nghiệp vụ `generateToken` (generate token). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function generateToken
 * @param {*} user - Giá trị `user` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const generateToken = (user) =>
    jwt.sign(
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

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeEmail` (normalize email). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function normalizeEmail
 * @param {*} email - Giá trị `email` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0;
};

/**
 * Gửi nghiệp vụ `sendRegistrationVerificationEmail` (send registration verification email). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function sendRegistrationVerificationEmail
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const sendRegistrationVerificationEmail = async ({ user, verification }) => {
    const html = emailService.buildParkingMail({
        actionLabel: "Xác minh tài khoản",
        body: `Xin chào ${user.name || "bạn"}, nhập mã OTP bên dưới tại màn hình đăng ký để kích hoạt tài khoản Sunrise Parking. Bạn không cần chờ quản trị viên duyệt.`,
        otp: verification.otp,
        title: "Xác minh email đăng ký",
    });

    return emailService.sendMail({
        html,
        subject: "Sunrise Parking - Mã xác minh đăng ký",
        text: `Mã OTP xác minh tài khoản Sunrise Parking của bạn là ${verification.otp}. Mã hết hạn sau ${verification.expiresMinutes} phút.`,
        to: user.email,
    });
};

/**
 * Tạo nghiệp vụ `buildAuthPayload` (build auth payload). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function buildAuthPayload
 * @param {*} user - Giá trị `user` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const buildAuthPayload = async (user) => {
    const currentUser = user.buildingId !== undefined
        ? user
        : await userService.getUserById(user.id);

    return {
        token: generateToken(currentUser),
        user: currentUser,
        requiresBuildingSelection: Boolean(
            currentUser.requiresBuildingSelection
        ),
    };
};

/**
 * Tạo nghiệp vụ `register` (register). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function register
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const register = async (req, res) => {
    try {
        const { name, email, phone, password, buildingId } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizeOptionalPhone(phone);

        if (!String(name || "").trim() || !normalizedEmail || !password) {
            return errorResponse(
                res,
                "Vui lòng nhập họ tên, email và mật khẩu.",
                400
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return errorResponse(res, "Email không hợp lệ.", 400);
        }

        if (String(password).length < 6) {
            return errorResponse(res, "Mật khẩu phải có ít nhất 6 ký tự.", 400);
        }

        if (!isValidVietnamPhone(normalizedPhone)) {
            return errorResponse(
                res,
                "Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng 0.",
                400
            );
        }

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ.", 400);
        }

        const existedUser = await userService.findExistingUserForRegister(
            normalizedEmail,
            normalizedPhone
        );

        if (existedUser) {
            return errorResponse(
                res,
                "Email hoặc số điện thoại đã tồn tại.",
                409,
                {
                    code: existedUser.email === normalizedEmail
                        && !existedUser.email_verified_at
                        ? "EMAIL_VERIFICATION_REQUIRED"
                        : "ACCOUNT_ALREADY_EXISTS",
                    email: existedUser.email === normalizedEmail
                        ? normalizedEmail
                        : undefined,
                }
            );
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        const newUser = await userService.createUser({
            buildingId: Number(buildingId),
            email: normalizedEmail,
            name: String(name).trim(),
            passwordHash,
            phone: normalizedPhone,
        });
        const verification =
            await registrationVerificationService.createVerificationRequest({
                userId: newUser.id,
            });
        let emailSent = true;
        let emailError = null;

        try {
            await sendRegistrationVerificationEmail({
                user: newUser,
                verification,
            });
        } catch (error) {
            emailSent = false;
            emailError = error.message;
        }

        return successResponse(
            res,
            emailSent
                ? "Đăng ký thành công. Hãy nhập mã OTP đã gửi tới email để kích hoạt tài khoản."
                : "Tài khoản đã được tạo nhưng chưa gửi được email. Hãy bấm gửi lại mã OTP.",
            {
                ...newUser,
                emailSent,
                emailError,
                verificationRequired: true,
                otpExpiresMinutes: verification.expiresMinutes,
            },
            201
        );
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return errorResponse(res, "Tòa nhà đã chọn không tồn tại.", 400);
        }

        return errorResponse(res, "Lỗi đăng ký tài khoản.", 500, error.message);
    }
};

/**
 * Kiểm tra nghiệp vụ `verifyRegistration` (verify registration). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function verifyRegistration
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const verifyRegistration = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || "").trim();

        if (!email || !/^\d{6}$/.test(otp)) {
            return errorResponse(
                res,
                "Vui lòng nhập email và mã OTP gồm 6 chữ số.",
                400
            );
        }

        const verification =
            await registrationVerificationService.findValidVerificationRequest({
                email,
                otp,
            });

        if (!verification) {
            return errorResponse(
                res,
                "Mã OTP không đúng hoặc đã hết hạn.",
                400
            );
        }

        const user = await userService.markEmailVerified(verification.userId);
        await registrationVerificationService.markVerificationRequestUsed(
            verification.id
        );

        return successResponse(
            res,
            "Xác minh email thành công. Bạn có thể đăng nhập ngay.",
            {
                email: user.email,
                emailVerified: true,
            }
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi xác minh email đăng ký.",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `resendRegistrationOtp` (resend registration otp). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function resendRegistrationOtp
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const resendRegistrationOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return errorResponse(res, "Vui lòng nhập email.", 400);
        }

        const user = await userService.findUserByEmail(email);

        if (!user) {
            return successResponse(
                res,
                "Nếu email cần xác minh tồn tại, hệ thống sẽ gửi một mã OTP mới."
            );
        }

        if (user.email_verified_at) {
            return successResponse(
                res,
                "Email đã được xác minh. Bạn có thể đăng nhập ngay."
            );
        }

        const verification =
            await registrationVerificationService.createVerificationRequest({
                userId: user.id,
            });

        await sendRegistrationVerificationEmail({
            user,
            verification,
        });

        return successResponse(
            res,
            "Đã gửi lại mã OTP xác minh tới email của bạn.",
            {
                email,
                otpExpiresMinutes: verification.expiresMinutes,
            }
        );
    } catch (error) {
        return errorResponse(
            res,
            "Không gửi lại được mã OTP xác minh.",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `login` (login). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function login
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const login = async (req, res) => {
    try {
        const emailOrPhone = String(req.body.emailOrPhone || "").trim();
        const password = String(req.body.password || "");

        if (!emailOrPhone || !password) {
            return errorResponse(
                res,
                "Vui lòng nhập email hoặc số điện thoại và mật khẩu.",
                400
            );
        }

        const user = await userService.findUserByEmailOrPhone(emailOrPhone);

        if (!user) {
            return errorResponse(
                res,
                "Email, số điện thoại hoặc mật khẩu không đúng.",
                401
            );
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            return errorResponse(
                res,
                "Email, số điện thoại hoặc mật khẩu không đúng.",
                401
            );
        }

        if (user.status !== USER_STATUSES.ACTIVE) {
            return errorResponse(
                res,
                "Tài khoản đã bị khóa hoặc không còn hoạt động.",
                403,
                { status: user.status }
            );
        }

        if (!user.email_verified_at) {
            return errorResponse(
                res,
                "Bạn cần xác minh mã OTP trong email trước khi đăng nhập.",
                403,
                {
                    code: "EMAIL_VERIFICATION_REQUIRED",
                    email: user.email,
                }
            );
        }

        const currentUser = await userService.getUserById(user.id);
        const payload = await buildAuthPayload(currentUser);

        return successResponse(res, "Đăng nhập thành công.", payload);
    } catch (error) {
        return errorResponse(res, "Lỗi đăng nhập.", 500, error.message);
    }
};

/**
 * Thực hiện nghiệp vụ `googleLogin` (google login). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function googleLogin
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const googleLogin = async (req, res) => {
    try {
        const googleProfile = await googleIdentityService.verifyCredential(
            req.body.credential
        );
        let user = await userService.findUserByGoogleSubject(
            googleProfile.googleSubject
        );
        let isNewAccount = false;

        if (!user) {
            user = await userService.findUserByEmail(googleProfile.email);

            if (user?.google_subject &&
                user.google_subject !== googleProfile.googleSubject) {
                return errorResponse(
                    res,
                    "Email này đã liên kết với một tài khoản Google khác.",
                    409
                );
            }

            if (user) {
                user = await userService.linkGoogleIdentity({
                    avatarUrl: googleProfile.avatarUrl,
                    googleSubject: googleProfile.googleSubject,
                    id: user.id,
                });
            } else {
                const passwordHash = await bcrypt.hash(
                    crypto.randomBytes(48).toString("hex"),
                    10
                );

                user = await userService.createGoogleUser({
                    avatarUrl: googleProfile.avatarUrl,
                    email: googleProfile.email,
                    googleSubject: googleProfile.googleSubject,
                    name: googleProfile.name,
                    passwordHash,
                });
                isNewAccount = true;
            }
        } else {
            user = await userService.getUserById(user.id);
        }

        if (user.status !== USER_STATUSES.ACTIVE) {
            return errorResponse(
                res,
                "Tài khoản đã bị khóa hoặc không còn hoạt động.",
                403,
                { status: user.status }
            );
        }

        const payload = await buildAuthPayload(user);

        return successResponse(
            res,
            payload.requiresBuildingSelection
                ? "Đăng nhập Google thành công. Hãy chọn tòa nhà bạn đang sử dụng."
                : "Đăng nhập Google thành công.",
            {
                ...payload,
                isNewAccount,
            }
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Đăng nhập Google thất bại.",
            error.statusCode || 500
        );
    }
};

/**
 * Xử lý nghiệp vụ `completeGoogleOnboarding` (complete google onboarding). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function completeGoogleOnboarding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const completeGoogleOnboarding = async (req, res) => {
    try {
        if (!isValidId(req.body.buildingId)) {
            return errorResponse(res, "Vui lòng chọn một tòa nhà hợp lệ.", 400);
        }

        const currentUser = await userService.getUserById(req.user.id);

        if (!currentUser) {
            return errorResponse(res, "Không tìm thấy người dùng.", 404);
        }

        if (currentUser.authProvider === "LOCAL") {
            return errorResponse(
                res,
                "Tài khoản này không cần hoàn tất đăng nhập Google.",
                409
            );
        }

        const user = await userService.completeGoogleOnboarding({
            buildingId: Number(req.body.buildingId),
            id: req.user.id,
        });
        const payload = await buildAuthPayload(user);

        return successResponse(
            res,
            "Đã lưu tòa nhà. Bạn có thể bắt đầu sử dụng hệ thống.",
            payload
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không thể lưu tòa nhà đã chọn.",
            error.statusCode || 500
        );
    }
};

/**
 * Thực hiện nghiệp vụ `requestPasswordReset` (request password reset). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function requestPasswordReset
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const requestPasswordReset = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return errorResponse(res, "Vui lòng nhập email.", 400);
        }

        const user = await userService.findUserByEmail(email);

        if (!user) {
            return successResponse(
                res,
                "Nếu email tồn tại, hệ thống sẽ gửi hướng dẫn đổi mật khẩu."
            );
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

        return successResponse(
            res,
            "Đã gửi hướng dẫn đổi mật khẩu tới email của bạn."
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi gửi yêu cầu đổi mật khẩu.",
            500,
            error.message
        );
    }
};

/**
 * Kiểm tra nghiệp vụ `verifyPasswordReset` (verify password reset). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function verifyPasswordReset
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const verifyPasswordReset = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token =
            typeof req.body.token === "string" ? req.body.token.trim() : "";
        const otp =
            typeof req.body.otp === "string" ? req.body.otp.trim() : "";

        if (!email || (!token && !otp)) {
            return errorResponse(
                res,
                "Vui lòng nhập email và mã xác minh.",
                400
            );
        }

        const resetRequest =
            await passwordResetService.findValidResetRequest({
                email,
                otp,
                token,
            });

        if (!resetRequest) {
            return errorResponse(
                res,
                "Mã xác minh không đúng hoặc đã hết hạn.",
                400
            );
        }

        return successResponse(res, "Mã xác minh hợp lệ.");
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi kiểm tra mã xác minh.",
            500,
            error.message
        );
    }
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `resetPassword` (reset password). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function resetPassword
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const resetPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token =
            typeof req.body.token === "string" ? req.body.token.trim() : "";
        const otp =
            typeof req.body.otp === "string" ? req.body.otp.trim() : "";
        const password = String(req.body.password || "");

        if (!email || (!token && !otp)) {
            return errorResponse(
                res,
                "Vui lòng nhập email và mã xác minh.",
                400
            );
        }

        if (password.length < 6) {
            return errorResponse(
                res,
                "Mật khẩu mới phải có ít nhất 6 ký tự.",
                400
            );
        }

        const resetRequest =
            await passwordResetService.findValidResetRequest({
                email,
                otp,
                token,
            });

        if (!resetRequest) {
            return errorResponse(
                res,
                "Mã xác minh không đúng hoặc đã hết hạn.",
                400
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await userService.updateUserPassword({
            id: resetRequest.userId,
            passwordHash,
        });
        await passwordResetService.markResetRequestUsed(resetRequest.id);

        return successResponse(
            res,
            "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi đổi mật khẩu.",
            500,
            error.message
        );
    }
};

/**
 * Thực hiện nghiệp vụ `refresh` (refresh). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function refresh
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const refresh = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy người dùng.", 404);
        }

        const payload = await buildAuthPayload(user);

        return successResponse(
            res,
            "Làm mới đăng nhập thành công.",
            payload
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi làm mới đăng nhập.",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getCurrentUser` (get current user). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getCurrentUser
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getCurrentUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return errorResponse(res, "Không tìm thấy người dùng.", 404);
        }

        const vehicles = await userService.getVehiclesByUserId(req.user.id);

        return successResponse(
            res,
            "Lấy thông tin người dùng hiện tại thành công.",
            {
                ...user,
                vehicleCount: vehicles.length,
                vehicles,
            }
        );
    } catch (error) {
        return errorResponse(
            res,
            "Lỗi lấy thông tin người dùng hiện tại.",
            500,
            error.message
        );
    }
};

module.exports = {
    completeGoogleOnboarding,
    getCurrentUser,
    googleLogin,
    login,
    refresh,
    register,
    requestPasswordReset,
    resendRegistrationOtp,
    resetPassword,
    verifyPasswordReset,
    verifyRegistration,
};
