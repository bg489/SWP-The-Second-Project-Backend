const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { errorResponse } = require("../utils/response");
const { USER_STATUSES, normalizeRole } = require("../utils/constants");

const authMiddleware = async (req, res, next) => {
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
            `SELECT id, role, status, building_id AS buildingId
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

        req.user = {
            id: user.id,
            role: normalizeRole(user.role),
            status: user.status,
            buildingId: user.buildingId,
        };

        next();
    } catch (error) {
        return errorResponse(res, "Token không hợp lệ hoặc đã hết hạn", 401);
    }
};

module.exports = authMiddleware;
