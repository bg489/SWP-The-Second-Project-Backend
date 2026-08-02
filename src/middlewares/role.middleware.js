/**
 * @fileoverview Cung cấp middleware role.middleware để kiểm tra hoặc bổ sung dữ liệu trước khi controller xử lý.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
const { errorResponse } = require("../utils/response");
const { ROLES, normalizeRole } = require("../utils/constants");

/**
 * Thực hiện nghiệp vụ `allowRoles` (allow roles). Hàm quyết định request có được đi tiếp đến bước xử lý kế tiếp hay không. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function allowRoles
 * @param {*} allowedRoles - Giá trị `allowedRoles` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const allowRoles = (...allowedRoles) => {
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    /* Callback nội bộ của biểu thức hiện tại; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, "Bạn chưa đăng nhập", 401);
        }

        const currentRole = normalizeRole(req.user.role);

        if (!normalizedAllowedRoles.includes(currentRole)) {
            return errorResponse(
                res,
                "Bạn không có quyền truy cập chức năng này",
                403,
                {
                    requiredRoles: normalizedAllowedRoles,
                    currentRole,
                }
            );
        }

        next();
    };
};

// Backward-compatible name used across the older routes.
const requireRoles = allowRoles;

/**
 * Khai báo `adminMiddleware` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/middlewares/role.middleware.js.
 */
const adminMiddleware = allowRoles(ROLES.ADMIN);
/**
 * Khai báo `managerOrAdminMiddleware` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/middlewares/role.middleware.js.
 */
const managerOrAdminMiddleware = allowRoles(ROLES.ADMIN, ROLES.MANAGER);
/**
 * Khai báo `parkingStaffOrAboveMiddleware` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/middlewares/role.middleware.js.
 */
const parkingStaffOrAboveMiddleware = allowRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF);

// Keep old exports used by existing teammate code, but map them to new RBAC roles.
const parkingManagerMiddleware = managerOrAdminMiddleware;
/**
 * Khai báo `parkingStaffMiddleware` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/middlewares/role.middleware.js.
 */
const parkingStaffMiddleware = parkingStaffOrAboveMiddleware;

module.exports = {
    allowRoles,
    requireRoles,
    adminMiddleware,
    managerOrAdminMiddleware,
    parkingStaffOrAboveMiddleware,
    parkingManagerMiddleware,
    parkingStaffMiddleware,
};
