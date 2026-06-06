const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

const authMiddleware = (req, res, next) => {
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
        req.user = decoded;
        next();
    } catch (error) {
        return errorResponse(res, "Token không hợp lệ hoặc đã hết hạn", 401);
    }
};

module.exports = authMiddleware;
