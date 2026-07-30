const assert = require("node:assert/strict");
const test = require("node:test");

const {
    resolveEsmsDeliveryResult,
    resolveEsmsSmsType,
    resolveApprovedSmsContent,
    SMS_TEMPLATE_KEYS,
    WRONG_SLOT_VICTIM_UPDATE_TYPES,
} = require("./sms.service");

test("uses customer-care type for an approved Brandname", () => {
    assert.equal(
        resolveEsmsSmsType({
            brandname: "Baotrixemay",
            configuredType: "8",
        }),
        "2"
    );
    assert.equal(
        resolveEsmsSmsType({
            brandname: "",
            configuredType: "8",
        }),
        "8"
    );
});

test("distinguishes pending, delivered, and rejected carrier results", () => {
    assert.deepEqual(
        resolveEsmsDeliveryResult({
            CodeResult: "100",
            ReceiverList: [],
        }),
        {
            delivered: false,
            final: false,
        }
    );
    assert.deepEqual(
        resolveEsmsDeliveryResult({
            CodeResult: "100",
            ReceiverList: [{ IsSent: true, SentResult: true }],
        }),
        {
            delivered: true,
            final: true,
        }
    );
    assert.deepEqual(
        resolveEsmsDeliveryResult({
            CodeResult: "100",
            ReceiverList: [{ IsSent: "true", SentResult: "false" }],
        }),
        {
            delivered: false,
            final: true,
        }
    );
});

test("identifies the victim with the occupied slot and occupying vehicle", () => {
    const content = resolveApprovedSmsContent({
        relatedType: "WRONG_SLOT_CASE",
        templateData: {
            eventAt: new Date("2026-07-30T13:30:00Z"),
            occupyingPlate: "51G-888.88",
            slotCode: "B33-02",
        },
        templateKey: SMS_TEMPLATE_KEYS.WRONG_SLOT_VICTIM,
    });

    assert.equal(
        content,
        "Baotrixemay da nhan duoc so tien thanh toan 0 VND luc 30/07/2026 20:30 cho don hang OB3302BIXE51G88888. Cam on quy khach!"
    );
});

test("identifies the occupier with both vehicles and the occupied slot", () => {
    const content = resolveApprovedSmsContent({
        relatedType: "WRONG_SLOT_CASE",
        templateData: {
            occupyingPlate: "51G-888.88",
            reservedPlate: "30A-111.22",
            slotCode: "B33-02",
        },
        templateKey: SMS_TEMPLATE_KEYS.WRONG_SLOT_OCCUPIER,
    });

    assert.equal(
        content,
        "Xe 51G88888 chiem o B3302 cua xe 30A11122 doi xe trong 15 phut da hoan thanh. Kinh moi chu xe lien he Sunrise Parking den nhan xe. Tran trong."
    );
});

test("uses the approved generic template for other wrong-slot updates", () => {
    assert.equal(
        resolveApprovedSmsContent({
            content: "Sunrise Parking: O B33-02 cua ban da duoc tra lai.",
            relatedType: "WRONG_SLOT_CASE",
        }),
        "Cam on quy khach da su dung dich vu cua chung toi. Chuc quy khach mot ngay tot lanh!"
    );
});

test("uses approved templates for every victim slot transition", () => {
    const cases = [
        {
            expected:
                "Xe 30A11122 la xe bi chiem o B3302 duoc gan tam o B3303 da hoan thanh. Kinh moi chu xe bi chiem lien he Sunrise Parking den nhan xe. Tran trong.",
            updateType: WRONG_SLOT_VICTIM_UPDATE_TYPES.TEMP_ASSIGNED,
        },
        {
            expected:
                "Xe 30A11122 giu o tam B3303 o B3302 dang tam khoa da hoan thanh. Kinh moi chu xe bi chiem lien he Sunrise Parking den nhan xe. Tran trong.",
            updateType: WRONG_SLOT_VICTIM_UPDATE_TYPES.TEMP_RETAINED,
        },
        {
            expected:
                "Xe 30A11122 la xe bi chiem duoc tra lai o B3302 da hoan thanh. Kinh moi chu xe bi chiem lien he Sunrise Parking den nhan xe. Tran trong.",
            updateType: WRONG_SLOT_VICTIM_UPDATE_TYPES.ORIGINAL_RESTORED,
        },
        {
            expected:
                "Xe 30A11122 roi o tam B3303 o B3302 da duoc dat lai da hoan thanh. Kinh moi chu xe bi chiem lien he Sunrise Parking den nhan xe. Tran trong.",
            updateType:
                WRONG_SLOT_VICTIM_UPDATE_TYPES.ORIGINAL_RESTORED_AFTER_TEMP,
        },
    ];

    for (const testCase of cases) {
        const content = resolveApprovedSmsContent({
            relatedType: "WRONG_SLOT_CASE",
            templateData: {
                originalSlotCode: "B33-02",
                reservedPlate: "30A-111.22",
                temporarySlotCode: "B33-03",
                updateType: testCase.updateType,
            },
            templateKey: SMS_TEMPLATE_KEYS.WRONG_SLOT_VICTIM_UPDATE,
        });

        assert.equal(content, testCase.expected);
    }
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
