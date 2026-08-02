/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong phone.test.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `test` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/utils/phone.test.js.
 */
const test = require("node:test");
/**
 * Khai báo `assert` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/utils/phone.test.js.
 */
const assert = require("node:assert/strict");
const {
    isValidVietnamPhone,
    normalizeOptionalPhone,
} = require("./phone");

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
test("accepts an omitted optional phone number", () => {
    assert.equal(normalizeOptionalPhone(undefined), null);
    assert.equal(normalizeOptionalPhone("  "), null);
    assert.equal(isValidVietnamPhone(null), true);
    assert.equal(isValidVietnamPhone(""), true);
});

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
test("accepts exactly ten digits beginning with zero", () => {
    assert.equal(isValidVietnamPhone("0901234567"), true);
});

/* Callback nội bộ của lời gọi `test`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
test("rejects malformed phone numbers", () => {
    assert.equal(isValidVietnamPhone("901234567"), false);
    assert.equal(isValidVietnamPhone("090123456"), false);
    assert.equal(isValidVietnamPhone("09012345678"), false);
    assert.equal(isValidVietnamPhone("090-123-4567"), false);
});
