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
    PENDING: "PENDING",
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

const PACKAGE_PLAN_STATUSES = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

const PRICING_TYPES = {
    TURN: "TURN",
    HOURLY: "HOURLY",
};

const QR_PASS_TYPES = {
    MONTHLY: "MONTHLY",
    SLOT_REGISTRATION: "SLOT_REGISTRATION",
};

const QR_PASS_STATUSES = {
    ACTIVE: "ACTIVE",
    EXPIRED: "EXPIRED",
    LOCKED: "LOCKED",
    CANCELLED: "CANCELLED",
};

const TEMP_QR_CARD_STATUSES = {
    READY: "READY",
    IN_USE: "IN_USE",
    COMPLETED: "COMPLETED",
    LOST: "LOST",
    LOCKED: "LOCKED",
};

const VIOLATION_STATUSES = {
    OPEN: "OPEN",
    RESOLVED: "RESOLVED",
    COLLECTED: "COLLECTED",
    CANCELLED: "CANCELLED",
};

const VIOLATION_TYPE_STATUSES = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};

const BUILDING_CHANGE_REQUEST_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
};

const STAFF_ROLE_REQUEST_STATUSES = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
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
    PACKAGE_PLAN_STATUSES,
    PRICING_TYPES,
    QR_PASS_TYPES,
    QR_PASS_STATUSES,
    TEMP_QR_CARD_STATUSES,
    VIOLATION_STATUSES,
    VIOLATION_TYPE_STATUSES,
    BUILDING_CHANGE_REQUEST_STATUSES,
    STAFF_ROLE_REQUEST_STATUSES,
    normalizeEnum,
    normalizeRole,
    isValidEnumValue,
};
