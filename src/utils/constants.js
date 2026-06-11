const ROLES = {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    STAFF: "STAFF",
    USER: "USER",
};

const ROLE_ALIASES = {
    PARKING_MANAGER: ROLES.MANAGER,
    PARKING_STAFF: ROLES.STAFF,
};

const USER_STATUSES = {
    ACTIVE: "ACTIVE",
    LOCKED: "LOCKED",
    INACTIVE: "INACTIVE",
};

const FLOOR_TYPES = {
    MOTORBIKE: "MOTORBIKE",
    CAR: "CAR",
};

const FLOOR_STATUSES = {
    ACTIVE: "ACTIVE",
    LOCKED: "LOCKED",
    MAINTENANCE: "MAINTENANCE",
    INACTIVE: "INACTIVE",
};

const VEHICLE_TYPES = {
    MOTORBIKE: "MOTORBIKE",
    CAR: "CAR",
};

const VEHICLE_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
};

const normalizeEnum = (value) => {
    if (typeof value !== "string") {
        return value;
    }

    return value.trim().toUpperCase();
};

const normalizeRole = (role) => {
    const normalizedRole = normalizeEnum(role);
    return ROLE_ALIASES[normalizedRole] || normalizedRole;
};

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
    normalizeEnum,
    normalizeRole,
    isValidEnumValue,
};
