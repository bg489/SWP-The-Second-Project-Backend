/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong pricing.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `PARKING_FEES` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/constants/pricing.js.
 */
const PARKING_FEES = {
    MOTORBIKE_TURN: 4000,
    CAR_HOURLY: 20000,
};

module.exports = {
    PARKING_FEES,
};
