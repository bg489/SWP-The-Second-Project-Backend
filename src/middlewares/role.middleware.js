const { ROLES } = require("../constants/roles");
const { errorResponse } = require("../utils/response");

const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, "Ban chua dang nhap", 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            return errorResponse(
                res,
                `Ban khong co quyen. Can role: ${allowedRoles.join(", ")}`,
                403
            );
        }

        next();
    };
};

const adminMiddleware = requireRoles(ROLES.ADMIN);
const parkingManagerMiddleware = requireRoles(ROLES.PARKING_MANAGER);
const parkingStaffMiddleware = requireRoles(ROLES.PARKING_STAFF);

module.exports = {
    requireRoles,
    adminMiddleware,
    parkingManagerMiddleware,
    parkingStaffMiddleware,
};
