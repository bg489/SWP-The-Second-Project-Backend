const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    STAFF: "STAFF",
    USER: "USER",
    // Backward-compatible aliases for older code/docs.
    PARKING_MANAGER: "MANAGER",
    PARKING_STAFF: "STAFF",
};

const ROLE_ALIASES = {
    PARKING_MANAGER: ROLES.MANAGER,
    PARKING_STAFF: ROLES.STAFF,
};

const AUTHENTICATED_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.USER];

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
