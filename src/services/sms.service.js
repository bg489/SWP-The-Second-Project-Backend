const db = require("../config/db");

const DEFAULT_ESMS_URL =
    "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
const MAX_ATTEMPTS = 3;
const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const APPROVED_GENERIC_CUSTOMER_CARE_SMS =
    "Cam on quy khach da su dung dich vu cua chung toi. Chuc quy khach mot ngay tot lanh!";
const SMS_TEMPLATE_KEYS = Object.freeze({
    WRONG_SLOT_OCCUPIER: "WRONG_SLOT_OCCUPIER",
    WRONG_SLOT_VICTIM: "WRONG_SLOT_VICTIM",
});

const normalizeTemplateText = (value, maxLength) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, (character) => (character === "Đ" ? "D" : "d"))
        .replace(/[^A-Za-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);

const normalizeTemplateToken = (value, maxLength) =>
    normalizeTemplateText(value, maxLength)
        .replace(/\s/g, "")
        .toUpperCase()
        .slice(0, maxLength);

const formatTemplateDateTime = (value = new Date()) => {
    const date = new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const parts = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        timeZone: VIETNAM_TIME_ZONE,
        year: "numeric",
    }).formatToParts(safeDate);
    const getPart = (type) =>
        parts.find((part) => part.type === type)?.value || "";

    return `${getPart("day")}/${getPart("month")}/${getPart(
        "year"
    )} ${getPart("hour")}:${getPart("minute")}`;
};

const buildWrongSlotVictimSms = ({
    eventAt,
    occupyingPlate,
    slotCode,
} = {}) => {
    const orderReference = normalizeTemplateToken(
        `O${slotCode || "SLOT"}BIXE${occupyingPlate || "KHONGRO"}`,
        20
    );

    return (
        "Baotrixemay da nhan duoc so tien thanh toan 0 VND luc " +
        `${formatTemplateDateTime(eventAt)} cho don hang ${orderReference}. ` +
        "Cam on quy khach!"
    );
};

const buildWrongSlotOccupierSms = ({
    occupyingPlate,
    reservedPlate,
    slotCode,
} = {}) => {
    const vehicleDetails = normalizeTemplateText(
        [
            occupyingPlate || "Xe cua ban",
            "chiem o",
            slotCode || "khong ro",
            reservedPlate ? `cua xe ${reservedPlate}` : "",
            "doi xe trong 15 phut",
        ]
            .filter(Boolean)
            .join(" "),
        70
    );
    const contact = "chu xe lien he Sunrise Parking";

    return (
        `Xe ${vehicleDetails} da hoan thanh. ` +
        `Kinh moi ${contact} den nhan xe. Tran trong.`
    );
};

const resolveApprovedSmsContent = ({
    content,
    relatedType,
    templateData,
    templateKey,
}) => {
    if (templateKey === SMS_TEMPLATE_KEYS.WRONG_SLOT_VICTIM) {
        return buildWrongSlotVictimSms(templateData);
    }

    if (templateKey === SMS_TEMPLATE_KEYS.WRONG_SLOT_OCCUPIER) {
        return buildWrongSlotOccupierSms(templateData);
    }

    if (relatedType === "WRONG_SLOT_CASE") {
        return APPROVED_GENERIC_CUSTOMER_CARE_SMS;
    }

    return String(content || "").trim();
};

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
        sandbox: process.env.ESMS_SANDBOX === "true",
        secretKey,
        smsType: String(
            process.env.ESMS_SMS_TYPE || (brandname ? "2" : "8")
        ),
    };
};

const sendWithEsms = async ({ content, id, phone }) => {
    const config = getEsmsConfig();

    if (!config) {
        if (process.env.ESMS_ALLOW_PREVIEW === "true") {
            console.log("[sms:preview]", { content, phone });
            return {
                previewOnly: true,
                provider: "PREVIEW",
                providerMessageId: null,
            };
        }

        throw new Error(
            "Máy chủ chưa cấu hình ESMS_API_KEY và ESMS_SECRET_KEY nên chưa thể gửi SMS."
        );
    }

    const payload = {
        ApiKey: config.apiKey,
        Content: content,
        IsUnicode: /[^\x00-\x7F]/.test(content) ? "1" : "0",
        Phone: phone,
        RequestId: `SUNRISE-${id}-${Date.now()}`.slice(0, 50),
        Sandbox: config.sandbox ? "1" : "0",
        SecretKey: config.secretKey,
        SmsType: config.smsType,
    };

    if (config.brandname) {
        payload.Brandname = config.brandname;
    }

    const configuredTimeout = Number(process.env.ESMS_TIMEOUT_MS);
    const timeoutMs =
        Number.isFinite(configuredTimeout) && configuredTimeout >= 1000
            ? configuredTimeout
            : 10000;
    const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
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
    templateData,
    templateKey,
}) => {
    const executor = connection || db;
    const normalizedPhone = normalizeVietnamPhone(phone);
    const approvedContent = resolveApprovedSmsContent({
        content,
        relatedType,
        templateData,
        templateKey,
    });

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
            approvedContent.slice(0, 1000),
            relatedType || null,
            relatedId || null,
        ]
    );

    return result.insertId;
};

const processPendingSms = async ({ ids = [], limit = 20 } = {}) => {
    await db.query(
        `UPDATE sms_outbox
         SET status = 'FAILED',
             error_message = 'Khôi phục yêu cầu gửi bị gián đoạn',
             next_attempt_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'SENDING'
            AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE)`
    );

    const requestedIds = Array.isArray(ids)
        ? [
              ...new Set(
                  ids
                      .map(Number)
                      .filter((id) => Number.isInteger(id) && id > 0)
              ),
          ]
        : [];

    if (Array.isArray(ids) && ids.length > 0 && requestedIds.length === 0) {
        return [];
    }

    const filters = [
        "status IN ('PENDING', 'FAILED')",
        "attempt_count < ?",
        "next_attempt_at <= CURRENT_TIMESTAMP",
    ];
    const params = [MAX_ATTEMPTS];

    if (requestedIds.length > 0) {
        filters.push("id IN (?)");
        params.push(requestedIds);
    }

    params.push(Math.max(1, Number(limit) || 20));

    const [rows] = await db.query(
        `SELECT id, phone, content, attempt_count AS attemptCount
         FROM sms_outbox
         WHERE ${filters.join("\n            AND ")}
         ORDER BY id ASC
         LIMIT ?`,
        params
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
    resolveApprovedSmsContent,
    SMS_TEMPLATE_KEYS,
};
