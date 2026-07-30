const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/db");

const getExpiresMinutes = () => {
    const configured = Number(process.env.REGISTRATION_OTP_EXPIRES_MINUTES || 15);

    return Number.isInteger(configured) && configured >= 5 && configured <= 60
        ? configured
        : 15;
};

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
