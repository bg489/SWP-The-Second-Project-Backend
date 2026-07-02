const db = require("../config/db");

const notificationSelect = `
    SELECT
        id,
        user_id AS userId,
        title,
        message,
        evidence_url AS evidenceUrl,
        status,
        related_type AS relatedType,
        related_id AS relatedId,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM user_notifications
`;

const createNotification = async ({
    connection,
    evidenceUrl,
    message,
    relatedId,
    relatedType,
    title,
    userId,
}) => {
    const executor = connection || db;
    const [result] = await executor.query(
        `INSERT INTO user_notifications
            (user_id, title, message, evidence_url, related_type, related_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userId,
            title,
            message,
            evidenceUrl || null,
            relatedType || null,
            relatedId || null,
        ]
    );

    return result.insertId;
};

const getMyNotifications = async (userId) => {
    const [rows] = await db.query(
        `${notificationSelect}
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userId]
    );

    return rows;
};

module.exports = {
    createNotification,
    getMyNotifications,
};
