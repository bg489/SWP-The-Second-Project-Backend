const { OAuth2Client } = require("google-auth-library");

let oauthClient;

const getClientId = () => String(process.env.GOOGLE_CLIENT_ID || "").trim();

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
