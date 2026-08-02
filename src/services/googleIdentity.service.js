/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền googleIdentity.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
const { OAuth2Client } = require("google-auth-library");

/**
 * Khai báo `oauthClient` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/googleIdentity.service.js.
 */
let oauthClient;

/**
 * Lấy nghiệp vụ `getClientId` (get client id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getClientId
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getClientId = () => String(process.env.GOOGLE_CLIENT_ID || "").trim();

/**
 * Kiểm tra nghiệp vụ `verifyCredential` (verify credential). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function verifyCredential
 * @param {*} credential - Giá trị `credential` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const verifyCredential = async (credential) => {
    const clientId = getClientId();

    if (!clientId) {
        const error = new Error("Đăng nhập Google chưa được cấu hình trên máy chủ.");
        error.statusCode = 503;
        throw error;
    }

    if (!credential || typeof credential !== "string") {
        const error = new Error("Google không gửi thông tin đăng nhập hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    oauthClient ||= new OAuth2Client(clientId);

    try {
        const ticket = await oauthClient.verifyIdToken({
            audience: clientId,
            idToken: credential,
        });
        const payload = ticket.getPayload();

        if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
            const error = new Error("Tài khoản Google chưa xác minh email.");
            error.statusCode = 401;
            throw error;
        }

        return {
            avatarUrl: payload.picture || null,
            email: String(payload.email).trim().toLowerCase(),
            googleSubject: payload.sub,
            hostedDomain: payload.hd || null,
            name: String(payload.name || payload.given_name || payload.email).trim(),
        };
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        const invalidTokenError = new Error(
            "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn."
        );
        invalidTokenError.statusCode = 401;
        throw invalidTokenError;
    }
};

module.exports = {
    verifyCredential,
};
