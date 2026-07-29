const db = require("../config/db");
const { randomUUID } = require("crypto");
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
        HOURLY_SLOT_RESERVATION: `/user/slot-reservations?id=${relatedId || ""}`,
    };

    return `${frontendUrl}${paths[relatedType] || "/user/notifications"}`;
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const buildEvidenceEmail = (evidenceUrl) => {
    const normalizedUrl = String(evidenceUrl || "").trim();

    if (!normalizedUrl) {
        return {
            attachments: [],
            html: "",
            text: "",
        };
    }

    const dataImageMatch = normalizedUrl.match(
        /^data:image\/(jpeg|jpg|png|webp);base64,([\s\S]+)$/i
    );

    if (dataImageMatch) {
        const encodedImage = dataImageMatch[2].replace(/\s/g, "");
        const isValidBase64 =
            encodedImage.length > 0 &&
            encodedImage.length % 4 === 0 &&
            /^[A-Za-z0-9+/]*={0,2}$/.test(encodedImage);

        if (isValidBase64) {
            const sourceExtension = dataImageMatch[1].toLowerCase();
            const extension = sourceExtension === "jpeg" ? "jpg" : sourceExtension;
            const contentType = extension === "jpg"
                ? "image/jpeg"
                : `image/${extension}`;
            const cid = `evidence-${randomUUID()}@sunrise-parking`;

            return {
                attachments: [{
                    cid,
                    content: Buffer.from(encodedImage, "base64"),
                    contentDisposition: "inline",
                    contentType,
                    filename: `anh-minh-chung.${extension}`,
                }],
                html: `
                    <div style="margin:22px 0;padding:16px;border-radius:14px;background:#fff7fb;border:1px solid #f3d8e8;">
                        <div style="margin-bottom:10px;font-weight:800;color:#3b2336;">Ảnh minh chứng</div>
                        <img src="cid:${cid}" alt="Ảnh minh chứng" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;border:1px solid #ead2e1;" />
                    </div>
                `,
                text: "\n\nẢnh minh chứng được đính kèm trong email.",
            };
        }
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
        const safeUrl = escapeHtml(normalizedUrl);

        return {
            attachments: [],
            html: `
                <div style="margin:22px 0;padding:16px;border-radius:14px;background:#fff7fb;border:1px solid #f3d8e8;">
                    <div style="margin-bottom:10px;font-weight:800;color:#3b2336;">Ảnh minh chứng</div>
                    <img src="${safeUrl}" alt="Ảnh minh chứng" style="display:block;width:100%;max-width:520px;height:auto;margin-bottom:12px;border-radius:12px;border:1px solid #ead2e1;" />
                    <a href="${safeUrl}" style="color:#b54f8e;font-weight:700;">Mở ảnh minh chứng</a>
                </div>
            `,
            text: `\n\nẢnh minh chứng: ${normalizedUrl}`,
        };
    }

    return {
        attachments: [],
        html: "",
        text: "\n\nẢnh minh chứng có trong phần chi tiết của hệ thống.",
    };
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
    const evidence = buildEvidenceEmail(evidenceUrl);
    const messageHtml = escapeHtml(message).replace(/\r?\n/g, "<br/>");

    try {
        await emailService.sendMail({
            attachments: evidence.attachments,
            to: user.email,
            subject: `Sunrise Parking - ${title}`,
            text: `${title}\n\n${message}${evidence.text}`,
            html: emailService.buildParkingMail({
                title,
                bodyHtml: `${messageHtml}${evidence.html}`,
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
