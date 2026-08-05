/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của user.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `authController` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
const authController = require("./auth.controller");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
const userService = require("../services/user.service");
/**
 * Khai báo `notificationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
const notificationService = require("../services/notification.service");
/**
 * Khai báo `emailService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
const emailService = require("../services/email.service");
/**
 * Khai báo `profileUpdateService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
const profileUpdateService = require("../services/profileUpdate.service");
const imageStorageService = require("../services/imageStorage.service");
const { ROLES, AUTHENTICATED_ROLES } = require("../constants/roles");
const { USER_STATUSES } = require("../utils/constants");
const {
    isValidVietnamPhone,
    normalizeOptionalPhone,
} = require("../utils/phone");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Khai báo `BUSINESS_ROLES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/controllers/user.controller.js.
 */
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
 * Kiểm tra nghiệp vụ `isValidAvatarUrl` (is valid avatar url). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidAvatarUrl
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseCropNumber` (parse crop number). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parseCropNumber
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Tạo nghiệp vụ `buildProfilePayload` (build profile payload). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function buildProfilePayload
 * @param {*} body - Giá trị `body` được hàm sử dụng trong quá trình xử lý.
 * @param {*} currentUser - Giá trị `currentUser` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildProfilePayload = (body, currentUser) => {
    const name =
        typeof body.name === "string"
            ? body.name.trim()
            : currentUser.name;
    const phone = body.phone === undefined
        ? currentUser.phone || null
        : normalizeOptionalPhone(body.phone);
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

    if (!isValidVietnamPhone(phone)) {
        const error = new Error("Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
        error.statusCode = 400;
        throw error;
    }

    if (!isValidAvatarUrl(avatarUrl)) {
        const error = new Error("Link ảnh đại diện không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    /* Callback nội bộ của lời gọi `some`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Lấy nghiệp vụ `getAvailableRoles` (get available roles). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getAvailableRoles
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAvailableRoles = async (req, res) => {
    return successResponse(res, "Lay danh sach vai tro thanh cong", {
        accountRoles: AUTHENTICATED_ROLES,
        businessRoles: BUSINESS_ROLES,
    });
};

/**
 * Lấy nghiệp vụ `getAllUsers` (get all users). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getAllUsers
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();

        return successResponse(res, "Lay danh sach user thanh cong", users);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach user", 500, error.message);
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

/**
 * Uploads an avatar file and returns its short public URL. The profile is not
 * changed here; the URL still goes through the existing email confirmation.
 */
const uploadMyAvatarImage = async (req, res) => {
    try {
        if (!req.file) {
            return errorResponse(res, "Vui lòng chọn ảnh đại diện", 400);
        }

        const image = await imageStorageService.uploadAvatarImage({
            buffer: req.file.buffer,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
        });

        return successResponse(res, "Tải ảnh đại diện lên thành công", image, 201);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Không tải được ảnh đại diện",
            error.statusCode || 500
        );
    }
};

/**
 * Cập nhật nghiệp vụ `updateMyAvatar` (update my avatar). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateMyAvatar
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateMyProfile` (update my profile). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateMyProfile
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Thực hiện nghiệp vụ `requestMyProfileUpdate` (request my profile update). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function requestMyProfileUpdate
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Xử lý nghiệp vụ `confirmMyProfileUpdate` (confirm my profile update). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function confirmMyProfileUpdate
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getStaffCandidatesForMyBuilding` (get staff candidates for my building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getStaffCandidatesForMyBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `assignStaffToMyBuilding` (assign staff to my building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function assignStaffToMyBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
    updateMyProfile,
    updateMyAvatar,
    uploadMyAvatarImage,
    requestMyProfileUpdate,
    confirmMyProfileUpdate,
    getStaffCandidatesForMyBuilding,
    assignStaffToMyBuilding,
};
