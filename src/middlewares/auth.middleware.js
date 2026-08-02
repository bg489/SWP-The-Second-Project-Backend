/**
 * @fileoverview Cung cấp middleware auth.middleware để kiểm tra hoặc bổ sung dữ liệu trước khi controller xử lý.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `jwt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/middlewares/auth.middleware.js.
 */
const jwt = require("jsonwebtoken");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/middlewares/auth.middleware.js.
 */
const db = require("../config/db");
const { errorResponse } = require("../utils/response");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

/**
 * Tạo nghiệp vụ `createAuthMiddleware` (create auth middleware). Hàm quyết định request có được đi tiếp đến bước xử lý kế tiếp hay không. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createAuthMiddleware
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const createAuthMiddleware = ({ allowIncompleteOnboarding = false } = {}) =>
    /* Callback nội bộ của biểu thức hiện tại; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    async (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return errorResponse(res, "Bạn chưa gửi access token", 401);
        }

        if (!authHeader.startsWith("Bearer ")) {
            return errorResponse(res, "Token phải có dạng: Bearer <token>", 401);
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const [rows] = await db.query(
                `SELECT
                    id,
                    role,
                    status,
                    building_id AS buildingId,
                    onboarding_completed AS onboardingCompleted
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [decoded.id]
            );

            const user = rows[0];

            if (!user) {
                return errorResponse(res, "Tài khoản không tồn tại", 401);
            }

            if (user.status !== USER_STATUSES.ACTIVE) {
                return errorResponse(
                    res,
                    "Tài khoản đã bị khóa hoặc không còn hoạt động",
                    403,
                    { status: user.status }
                );
            }

            if (!allowIncompleteOnboarding && !user.onboardingCompleted) {
                return errorResponse(
                    res,
                    "Vui lòng chọn tòa nhà trước khi sử dụng chức năng này.",
                    403,
                    { code: "ONBOARDING_REQUIRED" }
                );
            }

            req.user = {
                id: user.id,
                role: normalizeRole(user.role),
                status: user.status,
                buildingId: user.buildingId,
                onboardingCompleted: Boolean(user.onboardingCompleted),
            };

            next();
        } catch (error) {
            return errorResponse(
                res,
                "Token không hợp lệ hoặc đã hết hạn",
                401
            );
        }
    };

/**
 * Khai báo `authMiddleware` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/middlewares/auth.middleware.js.
 */
const authMiddleware = createAuthMiddleware();

authMiddleware.allowIncompleteOnboarding = createAuthMiddleware({
    allowIncompleteOnboarding: true,
});

module.exports = authMiddleware;
