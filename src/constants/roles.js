/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong roles.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `ROLES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/constants/roles.js.
 */
const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    STAFF: "STAFF",
    USER: "USER",
    // Backward-compatible aliases for older code/docs.
    PARKING_MANAGER: "MANAGER",
    PARKING_STAFF: "STAFF",
};

/**
 * Khai báo `ROLE_ALIASES` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/constants/roles.js.
 */
const ROLE_ALIASES = {
    PARKING_MANAGER: ROLES.MANAGER,
    PARKING_STAFF: ROLES.STAFF,
};

/**
 * Khai báo `AUTHENTICATED_ROLES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/constants/roles.js.
 */
const AUTHENTICATED_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.USER];

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeRole` (normalize role). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function normalizeRole
 * @param {*} role - Giá trị `role` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeRole = (role) => {
    if (typeof role !== "string") {
        return role;
    }

    const normalizedRole = role.trim().toUpperCase();
    return ROLE_ALIASES[normalizedRole] || normalizedRole;
};

module.exports = {
    ROLES,
    ROLE_ALIASES,
    AUTHENTICATED_ROLES,
    normalizeRole,
};
