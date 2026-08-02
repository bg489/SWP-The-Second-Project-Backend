/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền sms.service.test.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `assert` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/sms.service.test.js.
 */
const assert = require("node:assert/strict");
/**
 * Khai báo `test` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/sms.service.test.js.
 */
const test = require("node:test");

const {
    resolveEsmsDeliveryResult,
    resolveEsmsSmsType,
    resolveApprovedSmsContent,
    SMS_TEMPLATE_KEYS,
    WRONG_SLOT_VICTIM_UPDATE_TYPES,
} = require("./sms.service");

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
test("uses the approved generic template for other wrong-slot updates", () => {
    assert.equal(
        resolveApprovedSmsContent({
            content: "Sunrise Parking: O B33-02 cua ban da duoc tra lai.",
            relatedType: "WRONG_SLOT_CASE",
        }),
        "Cam on quy khach da su dung dich vu cua chung toi. Chuc quy khach mot ngay tot lanh!"
    );
});

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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
