const db = require("../config/db");

const DEFAULT_ESMS_URL =
    "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
const MAX_ATTEMPTS = 3;

const normalizeVietnamPhone = (value) => {
    const compact = String(value || "").replace(/[^\d+]/g, "");

    if (compact.startsWith("+84")) {
        return `0${compact.slice(3)}`;
    }

    if (compact.startsWith("84") && compact.length >= 11) {
        return `0${compact.slice(2)}`;
    }

    return compact;
};

const getEsmsConfig = () => {
    const apiKey = process.env.ESMS_API_KEY;
    const secretKey = process.env.ESMS_SECRET_KEY;

    if (!apiKey || !secretKey) {
        return null;
    }

    const brandname = String(process.env.ESMS_BRANDNAME || "").trim();

    return {
        apiKey,
        brandname,
        endpoint: process.env.ESMS_API_URL || DEFAULT_ESMS_URL,
        sandbox: process.env.ESMS_SANDBOX !== "false",
        secretKey,
        smsType: String(
            process.env.ESMS_SMS_TYPE || (brandname ? "2" : "8")
        ),
    };
};

const sendWithEsms = async ({ content, id, phone }) => {
    const config = getEsmsConfig();

    if (!config) {
        console.log("[sms:preview]", { content, phone });
        return {
            previewOnly: true,
            provider: "PREVIEW",
            providerMessageId: null,
        };
    }

    const payload = {
        ApiKey: config.apiKey,
        Content: content,
        IsUnicode: "1",
        Phone: phone,
        RequestId: `SUNRISE-${id}-${Date.now()}`.slice(0, 50),
        Sandbox: config.sandbox ? "1" : "0",
        SecretKey: config.secretKey,
        SmsType: config.smsType,
    };

    if (config.brandname) {
        payload.Brandname = config.brandname;
    }

    const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || String(data.CodeResult) !== "100") {
        throw new Error(
            data.ErrorMessage ||
            data.error ||
            `eSMS từ chối yêu cầu (${data.CodeResult || response.status})`
        );
    }

    return {
        previewOnly: config.sandbox,
        provider: "ESMS",
        providerMessageId: data.SMSID || null,
    };
};

const queueSms = async ({
    connection,
    content,
    phone,
    relatedId,
    relatedType,
}) => {
    const executor = connection || db;
    const normalizedPhone = normalizeVietnamPhone(phone);

    if (!/^0\d{9,10}$/.test(normalizedPhone)) {
        console.warn("[sms:skip-invalid-phone]", {
            phone,
            relatedId,
            relatedType,
        });
        return null;
    }

    const [result] = await executor.query(
        `INSERT INTO sms_outbox
            (phone, content, related_type, related_id)
         VALUES (?, ?, ?, ?)`,
        [
            normalizedPhone,
            String(content || "").trim().slice(0, 1000),
            relatedType || null,
            relatedId || null,
        ]
    );

    return result.insertId;
};

const processPendingSms = async ({ limit = 20 } = {}) => {
    await db.query(
        `UPDATE sms_outbox
         SET status = 'FAILED',
             error_message = 'Khôi phục yêu cầu gửi bị gián đoạn',
             next_attempt_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'SENDING'
            AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE)`
    );

    const [rows] = await db.query(
        `SELECT id, phone, content, attempt_count AS attemptCount
         FROM sms_outbox
         WHERE status IN ('PENDING', 'FAILED')
            AND attempt_count < ?
            AND next_attempt_at <= CURRENT_TIMESTAMP
         ORDER BY id ASC
         LIMIT ?`,
        [MAX_ATTEMPTS, Number(limit)]
    );
    const results = [];

    for (const row of rows) {
        const [claimResult] = await db.query(
            `UPDATE sms_outbox
             SET status = 'SENDING',
                 attempt_count = attempt_count + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
                AND status IN ('PENDING', 'FAILED')`,
            [row.id]
        );

        if (claimResult.affectedRows === 0) {
            continue;
        }

        try {
            const delivery = await sendWithEsms({
                content: row.content,
                id: row.id,
                phone: row.phone,
            });
            const finalStatus = delivery.previewOnly ? "PREVIEW" : "SENT";

            await db.query(
                `UPDATE sms_outbox
                 SET status = ?,
                     provider = ?,
                     provider_message_id = ?,
                     error_message = NULL,
                     sent_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    finalStatus,
                    delivery.provider,
                    delivery.providerMessageId,
                    row.id,
                ]
            );
            results.push({ id: row.id, status: finalStatus });
        } catch (error) {
            const nextAttempt = Number(row.attemptCount || 0) + 1;

            await db.query(
                `UPDATE sms_outbox
                 SET status = 'FAILED',
                     error_message = ?,
                     next_attempt_at = DATE_ADD(
                         CURRENT_TIMESTAMP,
                         INTERVAL ? MINUTE
                     ),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    String(error.message || "Không gửi được SMS").slice(0, 500),
                    Math.min(nextAttempt * 2, 10),
                    row.id,
                ]
            );
            results.push({
                error: error.message,
                id: row.id,
                status: "FAILED",
            });
        }
    }

    return results;
};

module.exports = {
    normalizeVietnamPhone,
    processPendingSms,
    queueSms,
};
