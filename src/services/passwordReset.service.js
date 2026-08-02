/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền passwordReset.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/passwordReset.service.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `crypto` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/passwordReset.service.js.
 */
const crypto = require("crypto");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/passwordReset.service.js.
 */
const db = require("../config/db");

/**
 * Kiểm tra nghiệp vụ `hashToken` (hash token). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function hashToken
 * @param {*} token - Giá trị `token` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Tạo nghiệp vụ `createResetRequest` (create reset request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createResetRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createResetRequest = async ({ userId }) => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 15);

    await db.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = ?
            AND used_at IS NULL`,
        [userId]
    );

    const [result] = await db.query(
        `INSERT INTO password_reset_tokens
            (user_id, token_hash, otp_hash, expires_at)
         VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE))`,
        [userId, tokenHash, otpHash, expiresMinutes]
    );

    return {
        id: result.insertId,
        otp,
        token,
        expiresMinutes,
    };
};

/**
 * Lấy nghiệp vụ `findValidResetRequest` (find valid reset request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findValidResetRequest
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const findValidResetRequest = async ({ email, otp, token }) => {
    const params = [email];
    let condition = "";

    if (token) {
        condition = "AND pr.token_hash = ?";
        params.push(hashToken(token));
    }

    const [rows] = await db.query(
        `SELECT
            pr.id,
            pr.user_id AS userId,
            pr.otp_hash AS otpHash,
            pr.expires_at AS expiresAt,
            pr.used_at AS usedAt,
            u.email,
            u.name
         FROM password_reset_tokens pr
         INNER JOIN users u ON pr.user_id = u.id
         WHERE u.email = ?
            ${condition}
            AND pr.used_at IS NULL
            AND pr.expires_at >= CURRENT_TIMESTAMP
         ORDER BY pr.id DESC
         LIMIT 1`,
        params
    );

    const request = rows[0] || null;

    if (!request) {
        return null;
    }

    if (otp) {
        const otpMatches = await bcrypt.compare(String(otp), request.otpHash);

        if (!otpMatches) {
            return null;
        }
    }

    return request;
};

/**
 * Thực hiện nghiệp vụ `markResetRequestUsed` (mark reset request used). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function markResetRequestUsed
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markResetRequestUsed = async (id) => {
    await db.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
};

module.exports = {
    createResetRequest,
    findValidResetRequest,
    markResetRequestUsed,
};
