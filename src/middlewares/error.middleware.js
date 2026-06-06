const { errorResponse } = require("../utils/response");

const notFoundMiddleware = (req, res) => {
    return errorResponse(res, `Không tìm thấy API: ${req.method} ${req.originalUrl}`, 404);
};

const errorMiddleware = (err, req, res, next) => {
    console.error(err);

    return errorResponse(
        res,
        err.message || "Lỗi server",
        err.statusCode || 500
    );
};

module.exports = {
    notFoundMiddleware,
    errorMiddleware,
};
