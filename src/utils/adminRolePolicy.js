const { ROLES } = require("./constants");

const canAdminChangeRoleDirectly = (currentRole, nextRole) => {
    if (currentRole === nextRole) {
        return true;
    }

    if (currentRole === ROLES.STAFF || nextRole === ROLES.STAFF) {
        return false;
    }

    if (currentRole === ROLES.USER || currentRole === ROLES.MANAGER) {
        return [ROLES.USER, ROLES.MANAGER, ROLES.ADMIN].includes(nextRole);
    }

    if (currentRole === ROLES.ADMIN) {
        return [ROLES.ADMIN, ROLES.MANAGER].includes(nextRole);
    }

    return false;
};

module.exports = {
    canAdminChangeRoleDirectly,
};
