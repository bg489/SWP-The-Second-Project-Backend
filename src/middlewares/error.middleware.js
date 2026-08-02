/**
 * @fileoverview Cung cấp middleware error.middleware để kiểm tra hoặc bổ sung dữ liệu trước khi controller xử lý.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
const { errorResponse } = require("../utils/response");

/**
 * Thực hiện nghiệp vụ `notFoundMiddleware` (not found middleware). Hàm quyết định request có được đi tiếp đến bước xử lý kế tiếp hay không. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function notFoundMiddleware
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const notFoundMiddleware = (req, res) => {
    return errorResponse(res, `Không tìm thấy API: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Thực hiện nghiệp vụ `errorMiddleware` (error middleware). Hàm quyết định request có được đi tiếp đến bước xử lý kế tiếp hay không. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function errorMiddleware
 * @param {*} err - Giá trị `err` được hàm sử dụng trong quá trình xử lý.
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @param {*} next - Hàm chuyển quyền xử lý sang middleware kế tiếp.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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
