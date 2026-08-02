/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong response.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
const {
    localizeUserMessage,
    localizeUserPayload,
} = require("./userMessage");

/**
 * Thực hiện nghiệp vụ `successResponse` (success response). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function successResponse
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @param {*} message - Giá trị `message` được hàm sử dụng trong quá trình xử lý.
 * @param {*} data - Giá trị `data` được hàm sử dụng trong quá trình xử lý.
 * @param {*} statusCode - Giá trị `statusCode` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const successResponse = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: localizeUserMessage(message),
        data: localizeUserPayload(data),
    });
};

/**
 * Thực hiện nghiệp vụ `errorResponse` (error response). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function errorResponse
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @param {*} message - Giá trị `message` được hàm sử dụng trong quá trình xử lý.
 * @param {*} statusCode - Giá trị `statusCode` được hàm sử dụng trong quá trình xử lý.
 * @param {*} errors - Giá trị `errors` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const errorResponse = (res, message, statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message: localizeUserMessage(message),
        errors: localizeUserPayload(errors),
    });
};

module.exports = {
    successResponse,
    errorResponse,
};
