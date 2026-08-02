const test = require("node:test");
const assert = require("node:assert/strict");

const { canAdminChangeRoleDirectly } = require("./adminRolePolicy");
const { ROLES } = require("./constants");

test("keeps Staff accounts separate from every other role", () => {
    for (const role of [ROLES.USER, ROLES.MANAGER, ROLES.ADMIN]) {
        assert.equal(canAdminChangeRoleDirectly(role, ROLES.STAFF), false);
        assert.equal(canAdminChangeRoleDirectly(ROLES.STAFF, role), false);
    }
});

test("allows Staff status updates without changing its role", () => {
    assert.equal(canAdminChangeRoleDirectly(ROLES.STAFF, ROLES.STAFF), true);
});

test("preserves supported direct changes between non-Staff accounts", () => {
    assert.equal(canAdminChangeRoleDirectly(ROLES.USER, ROLES.MANAGER), true);
    assert.equal(canAdminChangeRoleDirectly(ROLES.MANAGER, ROLES.USER), true);
    assert.equal(canAdminChangeRoleDirectly(ROLES.ADMIN, ROLES.MANAGER), true);
});
