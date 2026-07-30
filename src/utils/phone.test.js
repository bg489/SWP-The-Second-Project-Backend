const test = require("node:test");
const assert = require("node:assert/strict");
const {
    isValidVietnamPhone,
    normalizeOptionalPhone,
} = require("./phone");

test("accepts an omitted optional phone number", () => {
    assert.equal(normalizeOptionalPhone(undefined), null);
    assert.equal(normalizeOptionalPhone("  "), null);
    assert.equal(isValidVietnamPhone(null), true);
    assert.equal(isValidVietnamPhone(""), true);
});

test("accepts exactly ten digits beginning with zero", () => {
    assert.equal(isValidVietnamPhone("0901234567"), true);
});

test("rejects malformed phone numbers", () => {
    assert.equal(isValidVietnamPhone("901234567"), false);
    assert.equal(isValidVietnamPhone("090123456"), false);
    assert.equal(isValidVietnamPhone("09012345678"), false);
    assert.equal(isValidVietnamPhone("090-123-4567"), false);
});
