const db = require("../config/db");
const emailService = require("./email.service");
const { localizeUserMessage } = require("../utils/userMessage");

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

const getNotificationUser = async ({ executor = db, userId }) => {
    let rows;

    try {
        [rows] = await executor.query(
            `SELECT
                id,
                name,
                email,
                email_notifications_enabled AS emailNotificationsEnabled
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
    } catch (error) {
        if (error.code !== "ER_BAD_FIELD_ERROR") {
            throw error;
        }

        [rows] = await executor.query(
            `SELECT
                id,
                name,
                email,
                1 AS emailNotificationsEnabled
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
    }

    return rows[0] || null;
};

const buildNotificationLink = (relatedType, relatedId) => {
    const frontendUrl = emailService.getFrontendUrl();

    const paths = {
        ACCOUNT: "/user/dashboard",
        BUILDING_CHANGE_REQUEST: "/user/building-change",
        STAFF_ASSIGNMENT: "/staff/dashboard",
        STAFF_ROLE_REQUEST_ADMIN: "/admin/staff-role-requests",
        STAFF_ROLE_REQUEST_MANAGER: "/manager/staff",
        VEHICLE: "/user/profile",
        WRONG_SLOT_CASE: `/user/parking-issues?type=wrong-slot&id=${relatedId || ""}`,
        FLOOR_MISMATCH_CASE: `/user/parking-issues?type=floor-mismatch&id=${relatedId || ""}`,
    };

    return `${frontendUrl}${paths[relatedType] || "/user/notifications"}`;
};

const sendNotificationEmail = async ({
    evidenceUrl,
    message,
    relatedId,
    relatedType,
    title,
    user,
}) => {
    if (!user?.email || Number(user.emailNotificationsEnabled) === 0) {
        return;
    }

    const detailLink = buildNotificationLink(relatedType, relatedId);
    const evidenceText = evidenceUrl
        ? `<br/><br/>Ảnh minh chứng: <a href="${evidenceUrl}">${evidenceUrl}</a>`
        : "";

    try {
        await emailService.sendMail({
            to: user.email,
            subject: `Sunrise Parking - ${title}`,
            text: `${title}\n\n${message}${evidenceUrl ? `\n\nẢnh minh chứng: ${evidenceUrl}` : ""}`,
            html: emailService.buildParkingMail({
                title,
                body: `${message}${evidenceText}`,
                buttonLabel: "Xem trong hệ thống",
                buttonUrl: detailLink,
            }),
        });
    } catch (error) {
        console.error("[notification:email]", error.message);
    }
};

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
    const user = await getNotificationUser({ executor, userId });
    const localizedTitle = localizeUserMessage(title);
    const localizedMessage = localizeUserMessage(message);

    const [result] = await executor.query(
        `INSERT INTO user_notifications
            (user_id, title, message, evidence_url, related_type, related_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userId,
            localizedTitle,
            localizedMessage,
            evidenceUrl || null,
            relatedType || null,
            relatedId || null,
        ]
    );

    // Email delivery must not hold up user-facing actions such as approvals.
    void sendNotificationEmail({
        evidenceUrl,
        message: localizedMessage,
        relatedId,
        relatedType,
        title: localizedTitle,
        user,
    });

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

const markNotificationRead = async ({ id, userId }) => {
    const [result] = await db.query(
        `UPDATE user_notifications
         SET status = 'READ',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
            AND user_id = ?
            AND status = 'UNREAD'`,
        [id, userId]
    );

    if (result.affectedRows === 0) {
        const [rows] = await db.query(
            `${notificationSelect}
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [id, userId]
        );
        return rows[0] || null;
    }

    const [rows] = await db.query(
        `${notificationSelect}
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [id, userId]
    );

    return rows[0] || null;
};

const markAllNotificationsRead = async (userId) => {
    const [result] = await db.query(
        `UPDATE user_notifications
         SET status = 'READ',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?
            AND status = 'UNREAD'`,
        [userId]
    );

    return {
        updatedCount: Number(result.affectedRows || 0),
    };
};

const getNotificationPreferences = async (userId) => {
    const user = await getNotificationUser({ userId });

    return {
        emailNotificationsEnabled: Number(user?.emailNotificationsEnabled) !== 0,
    };
};

const updateNotificationPreferences = async ({ emailNotificationsEnabled, userId }) => {
    await db.query(
        `UPDATE users
         SET email_notifications_enabled = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [emailNotificationsEnabled ? 1 : 0, userId]
    );

    return getNotificationPreferences(userId);
};

module.exports = {
    createNotification,
    getMyNotifications,
    getNotificationPreferences,
    markAllNotificationsRead,
    markNotificationRead,
    updateNotificationPreferences,
};
