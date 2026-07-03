const bcrypt = require("bcryptjs");
const db = require("../config/db");

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
