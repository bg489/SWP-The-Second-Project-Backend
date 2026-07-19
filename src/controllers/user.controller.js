const authController = require("./auth.controller");
const userService = require("../services/user.service");
const notificationService = require("../services/notification.service");
const emailService = require("../services/email.service");
const profileUpdateService = require("../services/profileUpdate.service");
const { ROLES, AUTHENTICATED_ROLES } = require("../constants/roles");
const { USER_STATUSES } = require("../utils/constants");
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

const isValidAvatarUrl = (value) => {
    if (!value) return true;
    if (value.length > 1024) return false;

    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
};

const normalizePhone = (value) => {
    if (value === undefined || value === null || value === "") return null;

    return String(value).replace(/\D/g, "");
};

const parseCropNumber = ({ fallback, max, min, value }) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Math.min(max, Math.max(min, parsed));
};

const buildProfilePayload = (body, currentUser) => {
    const name =
        typeof body.name === "string"
            ? body.name.trim()
            : currentUser.name;
    const phone = normalizePhone(body.phone);
    const avatarUrl =
        body.avatarUrl === undefined
            ? undefined
            : String(body.avatarUrl || "").trim();
    const avatarCropX = parseCropNumber({
        fallback: currentUser.avatarCropX ?? 50,
        max: 100,
        min: 0,
        value: body.avatarCropX,
    });
    const avatarCropY = parseCropNumber({
        fallback: currentUser.avatarCropY ?? 50,
        max: 100,
        min: 0,
        value: body.avatarCropY,
    });
    const avatarCropZoom = parseCropNumber({
        fallback: currentUser.avatarCropZoom ?? 1,
        max: 3,
        min: 1,
        value: body.avatarCropZoom,
    });

    if (!name || name.length < 2 || name.length > 80) {
        const error = new Error("Họ tên phải từ 2 đến 80 ký tự");
        error.statusCode = 400;
        throw error;
    }

    if (phone && !/^0\d{9}$/.test(phone)) {
        const error = new Error("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
        error.statusCode = 400;
        throw error;
    }

    if (!isValidAvatarUrl(avatarUrl)) {
        const error = new Error("Link ảnh đại diện không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    if ([avatarCropX, avatarCropY, avatarCropZoom].some((value) => value === null)) {
        const error = new Error("Thông số cắt ảnh đại diện không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    return {
        avatarCropX,
        avatarCropY,
        avatarCropZoom,
        avatarUrl,
        name,
        phone,
    };
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

        if (
            role !== user.role
            && [ROLES.STAFF, ROLES.USER].includes(role)
        ) {
            return errorResponse(
                res,
                "Viec chuyen sang nhan vien hoac cu dan phai qua de nghi cua quan ly",
                409
            );
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

const updateMyAvatar = async (req, res) => {
    try {
        const avatarUrl =
            typeof req.body.avatarUrl === "string" ? req.body.avatarUrl.trim() : "";

        if (!avatarUrl) {
            return errorResponse(res, "avatarUrl khong duoc de trong", 400);
        }

        if (!isValidAvatarUrl(avatarUrl)) {
            return errorResponse(res, "Link anh dai dien khong hop le", 400);
        }

        const user = await userService.updateUserAvatar({
            id: req.user.id,
            avatarUrl,
        });

        return successResponse(res, "Cap nhat anh dai dien thanh cong", user);
    } catch (error) {
        return errorResponse(res, "Loi cap nhat anh dai dien", 500, error.message);
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const currentUser = await userService.getUserById(req.user.id);

        if (!currentUser) {
            return errorResponse(res, "Khong tim thay user", 404);
        }

        const payload = buildProfilePayload(req.body, currentUser);

        const user = await userService.updateUserProfile({
            id: req.user.id,
            ...payload,
        });

        return successResponse(res, "Cap nhat ho so thanh cong", user);
    } catch (error) {
        return errorResponse(
            res,
            error.statusCode ? error.message : "Loi cap nhat ho so",
            error.statusCode || 500,
            error.statusCode ? undefined : error.message
        );
    }
};

const requestMyProfileUpdate = async (req, res) => {
    try {
        const currentUser = await userService.getUserById(req.user.id);

        if (!currentUser) {
            return errorResponse(res, "Không tìm thấy tài khoản", 404);
        }

        const payload = buildProfilePayload(req.body, currentUser);
        const request = await profileUpdateService.createProfileUpdateRequest({
            payload,
            userId: req.user.id,
        });

        await emailService.sendMail({
            to: currentUser.email,
            subject: "Sunrise Parking - Mã xác minh cập nhật hồ sơ",
            text: `Mã xác minh cập nhật hồ sơ của bạn là ${request.otp}. Mã hết hạn sau ${request.expiresMinutes} phút.`,
            html: emailService.buildParkingMail({
                title: "Xác minh cập nhật hồ sơ",
                body: "Nhập mã bên dưới trên trang hồ sơ để hoàn tất cập nhật thông tin cá nhân.",
                otp: request.otp,
            }),
        });

        return successResponse(res, "Đã gửi mã xác minh tới email của bạn", {
            expiresMinutes: request.expiresMinutes,
            requestId: request.id,
        });
    } catch (error) {
        return errorResponse(
            res,
            error.statusCode ? error.message : "Lỗi gửi mã xác minh hồ sơ",
            error.statusCode || 500,
            error.statusCode ? undefined : error.message
        );
    }
};

const confirmMyProfileUpdate = async (req, res) => {
    try {
        const requestId = Number(req.body.requestId);
        const otp = String(req.body.otp || "").trim();

        if (!Number.isInteger(requestId) || requestId <= 0) {
            return errorResponse(res, "Yêu cầu cập nhật không hợp lệ", 400);
        }

        if (!/^\d{6}$/.test(otp)) {
            return errorResponse(res, "Mã xác minh phải gồm 6 số", 400);
        }

        const request = await profileUpdateService.findValidProfileUpdateRequest({
            id: requestId,
            otp,
            userId: req.user.id,
        });

        if (!request) {
            return errorResponse(res, "Mã xác minh không đúng hoặc đã hết hạn", 400);
        }

        const user = await userService.updateUserProfile({
            id: req.user.id,
            ...request.payload,
        });

        await profileUpdateService.markProfileUpdateRequestUsed(request.id);

        return successResponse(res, "Cập nhật hồ sơ thành công", user);
    } catch (error) {
        return errorResponse(res, "Lỗi xác minh cập nhật hồ sơ", 500, error.message);
    }
};

const getStaffCandidatesForMyBuilding = async (req, res) => {
    try {
        const manager = await userService.getUserById(req.user.id);

        if (!manager?.buildingId) {
            return errorResponse(res, "Tài khoản quản lý chưa được gán tòa nhà", 400);
        }

        const staff = await userService.getStaffCandidatesForBuilding({
            buildingId: manager.buildingId,
            q: req.query.q,
        });

        return successResponse(res, "Lấy danh sách nhân viên thành công", {
            building: {
                id: manager.buildingId,
                name: manager.buildingName,
                address: manager.buildingAddress,
            },
            staff,
        });
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách nhân viên", 500, error.message);
    }
};

const assignStaffToMyBuilding = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Nhân viên không hợp lệ", 400);
        }

        const manager = await userService.getUserById(req.user.id);

        if (!manager?.buildingId) {
            return errorResponse(res, "Tài khoản quản lý chưa được gán tòa nhà", 400);
        }

        const staff = await userService.getUserById(id);

        if (!staff || staff.role !== ROLES.STAFF) {
            return errorResponse(res, "Không tìm thấy nhân viên bãi xe", 404);
        }

        if (staff.status !== USER_STATUSES.ACTIVE) {
            return errorResponse(res, "Chỉ có thể gán nhân viên đã được duyệt", 400);
        }

        if (staff.buildingId && Number(staff.buildingId) !== Number(manager.buildingId)) {
            return errorResponse(res, "Nhân viên này đang thuộc tòa nhà khác", 400);
        }

        const updatedStaff = await userService.updateUserBuilding({
            id: Number(id),
            buildingId: Number(manager.buildingId),
        });

        await notificationService.createNotification({
            userId: Number(id),
            title: "Bạn đã được gán tòa làm việc",
            message: `Bạn hiện được phân công làm việc tại ${manager.buildingName || "tòa nhà mới"}.`,
            relatedType: "STAFF_ASSIGNMENT",
            relatedId: Number(manager.buildingId),
        });

        return successResponse(res, "Đã gán nhân viên vào tòa nhà", updatedStaff);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Lỗi gán nhân viên vào tòa nhà",
            error.statusCode || 500
        );
    }
};

module.exports = {
    getCurrentUser: authController.getCurrentUser,
    getAvailableRoles,
    getAllUsers,
    getUserById,
    updateUserRole,
    updateMyProfile,
    updateMyAvatar,
    requestMyProfileUpdate,
    confirmMyProfileUpdate,
    getStaffCandidatesForMyBuilding,
    assignStaffToMyBuilding,
};
