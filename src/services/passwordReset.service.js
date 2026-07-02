const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/db");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

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
