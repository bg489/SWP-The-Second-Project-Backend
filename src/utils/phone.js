/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong phone.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `VIETNAM_PHONE_REGEX` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/phone.js.
 */
const VIETNAM_PHONE_REGEX = /^0\d{9}$/;

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeOptionalPhone` (normalize optional phone). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function normalizeOptionalPhone
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeOptionalPhone = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const phone = String(value).trim();
    return phone || null;
};

/**
 * Kiểm tra nghiệp vụ `isValidVietnamPhone` (is valid vietnam phone). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function isValidVietnamPhone
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidVietnamPhone = (value) => {
    const phone = normalizeOptionalPhone(value);
    return phone === null || VIETNAM_PHONE_REGEX.test(phone);
};

module.exports = {
    VIETNAM_PHONE_REGEX,
    isValidVietnamPhone,
    normalizeOptionalPhone,
};
