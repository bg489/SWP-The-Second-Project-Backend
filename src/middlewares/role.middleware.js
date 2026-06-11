const { errorResponse } = require("../utils/response");
const { ROLES, normalizeRole } = require("../utils/constants");

const allowRoles = (...allowedRoles) => {
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

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

const adminMiddleware = allowRoles(ROLES.ADMIN);
const managerOrAdminMiddleware = allowRoles(ROLES.ADMIN, ROLES.MANAGER);
const parkingStaffOrAboveMiddleware = allowRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF);

// Keep old exports used by existing teammate code, but map them to new RBAC roles.
const parkingManagerMiddleware = managerOrAdminMiddleware;
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
