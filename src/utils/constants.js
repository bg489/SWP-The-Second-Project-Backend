/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong constants.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `ROLES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    STAFF: "STAFF",
    USER: "USER",
};

/**
 * Khai báo `ROLE_ALIASES` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const ROLE_ALIASES = {
    PARKING_MANAGER: ROLES.MANAGER,
    PARKING_STAFF: ROLES.STAFF,
};

/**
 * Khai báo `USER_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const USER_STATUSES = {
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    LOCKED: "LOCKED",
    INACTIVE: "INACTIVE",
};

/**
 * Khai báo `FLOOR_TYPES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const FLOOR_TYPES = {
    MOTORBIKE: "MOTORBIKE",
    CAR: "CAR",
};

/**
 * Khai báo `FLOOR_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const FLOOR_STATUSES = {
    ACTIVE: "ACTIVE",
    LOCKED: "LOCKED",
    MAINTENANCE: "MAINTENANCE",
    INACTIVE: "INACTIVE",
};

/**
 * Khai báo `VEHICLE_TYPES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const VEHICLE_TYPES = {
    MOTORBIKE: "MOTORBIKE",
    CAR: "CAR",
};

/**
 * Khai báo `VEHICLE_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const VEHICLE_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
};

/**
 * Khai báo `PACKAGE_PLAN_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const PACKAGE_PLAN_STATUSES = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

/**
 * Khai báo `PRICING_TYPES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const PRICING_TYPES = {
    TURN: "TURN",
    HOURLY: "HOURLY",
};

/**
 * Khai báo `QR_PASS_TYPES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const QR_PASS_TYPES = {
    MONTHLY: "MONTHLY",
    SLOT_REGISTRATION: "SLOT_REGISTRATION",
};

/**
 * Khai báo `QR_PASS_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const QR_PASS_STATUSES = {
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED",
    LOCKED: "LOCKED",
    CANCELLED: "CANCELLED",
};

/**
 * Khai báo `TEMP_QR_CARD_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const TEMP_QR_CARD_STATUSES = {
    READY: "READY",
    IN_USE: "IN_USE",
    COMPLETED: "COMPLETED",
    LOST: "LOST",
    LOCKED: "LOCKED",
};

/**
 * Khai báo `VIOLATION_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const VIOLATION_STATUSES = {
    OPEN: "OPEN",
    RESOLVED: "RESOLVED",
    COLLECTED: "COLLECTED",
    CANCELLED: "CANCELLED",
};

/**
 * Khai báo `VIOLATION_TYPE_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const VIOLATION_TYPE_STATUSES = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

/**
 * Khai báo `BUILDING_CHANGE_REQUEST_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const BUILDING_CHANGE_REQUEST_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
};

/**
 * Khai báo `STAFF_ROLE_REQUEST_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const STAFF_ROLE_REQUEST_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
};

/**
 * Khai báo `STAFF_ROLE_REQUEST_TYPES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const STAFF_ROLE_REQUEST_TYPES = {
    CREATE_STAFF: "CREATE_STAFF",
    PROMOTE: "PROMOTE",
    DEMOTE: "DEMOTE",
};

/**
 * Khai báo `STAFF_PROFILE_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/utils/constants.js.
 */
const STAFF_PROFILE_STATUSES = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeEnum` (normalize enum). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function normalizeEnum
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeEnum = (value) => {
    if (typeof value !== "string") {
        return value;
    }

    return value.trim().toUpperCase();
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeRole` (normalize role). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function normalizeRole
 * @param {*} role - Giá trị `role` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeRole = (role) => {
    const normalizedRole = normalizeEnum(role);
    return ROLE_ALIASES[normalizedRole] || normalizedRole;
};

/**
 * Kiểm tra nghiệp vụ `isValidEnumValue` (is valid enum value). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function isValidEnumValue
 * @param {*} enumObject - Giá trị `enumObject` được hàm sử dụng trong quá trình xử lý.
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidEnumValue = (enumObject, value) => {
    return Object.values(enumObject).includes(value);
};

module.exports = {
    ROLES,
    ROLE_ALIASES,
    USER_STATUSES,
    FLOOR_TYPES,
    FLOOR_STATUSES,
    VEHICLE_TYPES,
    VEHICLE_STATUSES,
    PACKAGE_PLAN_STATUSES,
    PRICING_TYPES,
    QR_PASS_TYPES,
    QR_PASS_STATUSES,
    TEMP_QR_CARD_STATUSES,
    VIOLATION_STATUSES,
    VIOLATION_TYPE_STATUSES,
    BUILDING_CHANGE_REQUEST_STATUSES,
    STAFF_ROLE_REQUEST_STATUSES,
    STAFF_ROLE_REQUEST_TYPES,
    STAFF_PROFILE_STATUSES,
    normalizeEnum,
    normalizeRole,
    isValidEnumValue,
};
