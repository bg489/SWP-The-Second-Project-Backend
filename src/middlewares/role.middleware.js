const { errorResponse } = require("../utils/response");

const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, "Bạn chưa đăng nhập", 401);
    }

    if (req.user.role !== "ADMIN") {
        return errorResponse(res, "Bạn không có quyền admin", 403);
    }

    next();
};

module.exports = {
    adminMiddleware,
};