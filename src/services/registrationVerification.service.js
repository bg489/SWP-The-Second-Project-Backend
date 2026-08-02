/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền registrationVerification.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/registrationVerification.service.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `crypto` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/registrationVerification.service.js.
 */
const crypto = require("crypto");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/registrationVerification.service.js.
 */
const db = require("../config/db");

/**
 * Lấy nghiệp vụ `getExpiresMinutes` (get expires minutes). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getExpiresMinutes
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getExpiresMinutes = () => {
    const configured = Number(process.env.REGISTRATION_OTP_EXPIRES_MINUTES || 15);

    return Number.isInteger(configured) && configured >= 5 && configured <= 60
        ? configured
        : 15;
};

/**
 * Tạo nghiệp vụ `createVerificationRequest` (create verification request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createVerificationRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createVerificationRequest = async ({ userId }) => {
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresMinutes = getExpiresMinutes();

    await db.query(
        `UPDATE email_verification_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = ?
            AND used_at IS NULL`,
        [userId]
    );

    const [result] = await db.query(
        `INSERT INTO email_verification_tokens
            (user_id, otp_hash, expires_at)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE))`,
        [userId, otpHash, expiresMinutes]
    );

    return {
        id: result.insertId,
        expiresMinutes,
        otp,
    };
};

/**
 * Lấy nghiệp vụ `findValidVerificationRequest` (find valid verification request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findValidVerificationRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const findValidVerificationRequest = async ({ email, otp }) => {
    const [rows] = await db.query(
        `SELECT
            verification.id,
            verification.user_id AS userId,
            verification.otp_hash AS otpHash,
            verification.expires_at AS expiresAt,
            user.email,
            user.name
         FROM email_verification_tokens verification
         INNER JOIN users user ON user.id = verification.user_id
         WHERE user.email = ?
            AND verification.used_at IS NULL
            AND verification.expires_at >= CURRENT_TIMESTAMP
         ORDER BY verification.id DESC
         LIMIT 1`,
        [email]
    );
    const request = rows[0] || null;

    if (!request) {
        return null;
    }

    const otpMatches = await bcrypt.compare(String(otp || ""), request.otpHash);
    return otpMatches ? request : null;
};

/**
 * Thực hiện nghiệp vụ `markVerificationRequestUsed` (mark verification request used). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function markVerificationRequestUsed
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markVerificationRequestUsed = async (id) => {
    await db.query(
        `UPDATE email_verification_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
};

module.exports = {
    createVerificationRequest,
    findValidVerificationRequest,
    markVerificationRequestUsed,
};
