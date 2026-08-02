/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền profileUpdate.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/profileUpdate.service.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/profileUpdate.service.js.
 */
const db = require("../config/db");

/**
 * Tạo nghiệp vụ `createProfileUpdateRequest` (create profile update request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createProfileUpdateRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createProfileUpdateRequest = async ({ payload, userId }) => {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresMinutes = Number(process.env.PROFILE_UPDATE_EXPIRES_MINUTES || 15);

    await db.query(
        `UPDATE profile_update_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = ?
            AND used_at IS NULL`,
        [userId]
    );

    const [result] = await db.query(
        `INSERT INTO profile_update_tokens
            (user_id, otp_hash, payload_json, expires_at)
         VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE))`,
        [userId, otpHash, JSON.stringify(payload), expiresMinutes]
    );

    return {
        expiresMinutes,
        id: result.insertId,
        otp,
    };
};

/**
 * Lấy nghiệp vụ `findValidProfileUpdateRequest` (find valid profile update request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findValidProfileUpdateRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const findValidProfileUpdateRequest = async ({ id, otp, userId }) => {
    const [rows] = await db.query(
        `SELECT
            id,
            user_id AS userId,
            otp_hash AS otpHash,
            payload_json AS payloadJson,
            expires_at AS expiresAt
         FROM profile_update_tokens
         WHERE id = ?
            AND user_id = ?
            AND used_at IS NULL
            AND expires_at >= CURRENT_TIMESTAMP
         LIMIT 1`,
        [id, userId]
    );

    const request = rows[0] || null;

    if (!request) {
        return null;
    }

    const otpMatches = await bcrypt.compare(String(otp || ""), request.otpHash);

    if (!otpMatches) {
        return null;
    }

    return {
        ...request,
        payload:
            typeof request.payloadJson === "string"
                ? JSON.parse(request.payloadJson)
                : request.payloadJson,
    };
};

/**
 * Thực hiện nghiệp vụ `markProfileUpdateRequestUsed` (mark profile update request used). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function markProfileUpdateRequestUsed
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markProfileUpdateRequestUsed = async (id) => {
    await db.query(
        `UPDATE profile_update_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
};

module.exports = {
    createProfileUpdateRequest,
    findValidProfileUpdateRequest,
    markProfileUpdateRequestUsed,
};
