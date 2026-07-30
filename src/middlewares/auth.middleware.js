const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { errorResponse } = require("../utils/response");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

const createAuthMiddleware = ({ allowIncompleteOnboarding = false } = {}) =>
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

const authMiddleware = createAuthMiddleware();

authMiddleware.allowIncompleteOnboarding = createAuthMiddleware({
    allowIncompleteOnboarding: true,
});

module.exports = authMiddleware;
