const assert = require("node:assert/strict");
const test = require("node:test");

const { resolveApprovedSmsContent } = require("./sms.service");

test("uses the approved generic template for wrong-slot alerts", () => {
    const content = resolveApprovedSmsContent({
        content: "Sunrise Parking: O B33-02 cua ban dang bi chiem.",
        relatedType: "WRONG_SLOT_CASE",
    });

    assert.equal(
        content,
        "Cam on quy khach da su dung dich vu cua chung toi. Chuc quy khach mot ngay tot lanh!"
    );
});

test("keeps approved reservation payment content unchanged", () => {
    const content =
        "Baotrixemay da nhan duoc so tien thanh toan 120000 VND luc 30/07/2026 20:30 cho don hang SPB3302R42. Cam on quy khach!";

    assert.equal(
        resolveApprovedSmsContent({
            content,
            relatedType: "HOURLY_SLOT_RESERVATION",
        }),
        content
    );
});
