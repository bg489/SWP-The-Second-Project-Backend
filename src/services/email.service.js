const getFrontendUrl = () =>
    (process.env.FRONTEND_URL || process.env.APP_FRONTEND_URL || "http://localhost:5173")
        .replace(/\/$/, "");

let gmailTokenCache = {
    accessToken: null,
    expiresAt: 0,
};

const getGmailApiConfig = () => {
    const config = {
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        fromEmail: process.env.GMAIL_FROM_EMAIL,
        fromName: process.env.GMAIL_FROM_NAME || "Sunrise Parking",
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    };

    return Object.values({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        fromEmail: config.fromEmail,
        refreshToken: config.refreshToken,
    }).every(Boolean)
        ? config
        : null;
};

const getGmailAccessToken = async (config) => {
    if (
        gmailTokenCache.accessToken &&
        gmailTokenCache.expiresAt > Date.now() + 60000
    ) {
        return gmailTokenCache.accessToken;
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: "refresh_token",
            refresh_token: config.refreshToken,
        }),
    });
    const data = await response.json();

    if (!response.ok || !data.access_token) {
        throw new Error(
            data.error_description ||
            data.error ||
            "Không lấy được quyền gửi email từ Google"
        );
    }

    gmailTokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    };

    return gmailTokenCache.accessToken;
};

const encodeMailHeader = (value) =>
    `=?UTF-8?B?${Buffer.from(String(value || ""), "utf8").toString("base64")}?=`;

const wrapBase64 = (value) =>
    String(value || "").match(/.{1,76}/g)?.join("\r\n") || "";

const encodeMailBody = (value) =>
    wrapBase64(Buffer.from(String(value || ""), "utf8").toString("base64"));

const encodeAttachmentContent = (value) =>
    wrapBase64(
        (Buffer.isBuffer(value) ? value : Buffer.from(value || "")).toString("base64")
    );

const toBase64Url = (value) =>
    Buffer.from(value, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

const createMailBoundary = (type) =>
    `sunrise-parking-${type}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

const sanitizeMimeValue = (value, fallback = "") =>
    String(value || fallback).replace(/[\r\n"]/g, "");

const buildRawGmailMessage = ({
    attachments = [],
    config,
    html,
    subject,
    text,
    to,
}) => {
    const inlineAttachments = attachments.filter((attachment) => attachment?.content);
    const alternativeBoundary = createMailBoundary("alternative");
    const relatedBoundary = inlineAttachments.length
        ? createMailBoundary("related")
        : null;
    const safeRecipient = String(to || "").replace(/[\r\n]/g, "");
    const safeFromEmail = String(config.fromEmail).replace(/[\r\n]/g, "");
    const safeFromName = String(config.fromName).replace(/[\r\n"]/g, "");
    const lines = [
        `From: "${safeFromName}" <${safeFromEmail}>`,
        `To: ${safeRecipient}`,
        `Subject: ${encodeMailHeader(subject)}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/${relatedBoundary ? "related" : "alternative"}; boundary="${relatedBoundary || alternativeBoundary}"`,
        "",
    ];

    if (relatedBoundary) {
        lines.push(
            `--${relatedBoundary}`,
            `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
            ""
        );
    }

    lines.push(
        `--${alternativeBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMailBody(text),
        `--${alternativeBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        encodeMailBody(html),
        `--${alternativeBoundary}--`,
        ""
    );

    if (relatedBoundary) {
        inlineAttachments.forEach((attachment, index) => {
            const filename = sanitizeMimeValue(
                attachment.filename,
                `attachment-${index + 1}`
            );
            const contentType = sanitizeMimeValue(
                attachment.contentType,
                "application/octet-stream"
            );
            const contentId = sanitizeMimeValue(
                attachment.cid,
                `attachment-${index + 1}@sunrise-parking`
            );
            const disposition = attachment.contentDisposition === "attachment"
                ? "attachment"
                : "inline";

            lines.push(
                `--${relatedBoundary}`,
                `Content-Type: ${contentType}; name="${filename}"`,
                "Content-Transfer-Encoding: base64",
                `Content-Disposition: ${disposition}; filename="${filename}"`,
                `Content-ID: <${contentId}>`,
                `X-Attachment-Id: ${contentId}`,
                "",
                encodeAttachmentContent(attachment.content),
                ""
            );
        });

        lines.push(`--${relatedBoundary}--`, "");
    }

    return toBase64Url(lines.join("\r\n"));
};

const sendWithGmailApi = async ({
    attachments,
    config,
    html,
    subject,
    text,
    to,
}) => {
    const accessToken = await getGmailAccessToken(config);
    const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                raw: buildRawGmailMessage({
                    attachments,
                    config,
                    html,
                    subject,
                    text,
                    to,
                }),
            }),
        }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            "Google không gửi được email"
        );
    }

    return {
        id: data.id,
        previewOnly: false,
        provider: "GMAIL_API",
    };
};

const createTransport = () => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!host && !user) {
        return null;
    }

    let nodemailer;

    try {
        nodemailer = require("nodemailer");
    } catch {
        return null;
    }

    if (host) {
        return nodemailer.createTransport({
            host,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: user && pass ? { user, pass } : undefined,
        });
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const buildParkingMail = ({
    actionLabel,
    body,
    bodyHtml,
    buttonLabel,
    buttonUrl,
    otp,
    title,
}) => {
    const buttonHtml = buttonUrl
        ? `<a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:linear-gradient(135deg,#ED9951,#FF6FD8);color:#fff;text-decoration:none;font-weight:800;">${escapeHtml(buttonLabel || actionLabel)}</a>`
        : "";
    const otpHtml = otp
        ? `<div style="margin:18px 0;padding:16px;border-radius:14px;background:#fff4fb;border:1px solid #ffd1f8;text-align:center;font-size:28px;letter-spacing:8px;font-weight:900;color:#241122;">${escapeHtml(otp)}</div>`
        : "";
    const mailBody = bodyHtml ??
        escapeHtml(body).replace(/\r?\n/g, "<br/>");

    return `
        <div style="margin:0;padding:28px;background:#fff7fb;font-family:Arial,sans-serif;color:#241122;">
            <div style="max-width:620px;margin:auto;border-radius:22px;overflow:hidden;background:#fff;border:1px solid #f3d8e8;box-shadow:0 18px 50px rgba(237,153,81,.18);">
                <div style="padding:28px;background:linear-gradient(135deg,#FFB8F5,#ED9951);">
                    <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.45);font-weight:800;">Sunrise Parking</div>
                    <h1 style="margin:18px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
                </div>
                <div style="padding:28px;">
                    <div style="font-size:16px;line-height:1.7;color:#60485b;">${mailBody}</div>
                    ${otpHtml}
                    ${buttonHtml}
                    <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#8a7083;">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này. Mã xác minh sẽ tự hết hạn.</p>
                </div>
            </div>
        </div>
    `;
};

const sendMail = async ({ attachments = [], html, subject, text, to }) => {
    const gmailApiConfig = getGmailApiConfig();

    if (gmailApiConfig) {
        return sendWithGmailApi({
            attachments,
            config: gmailApiConfig,
            html,
            subject,
            text,
            to,
        });
    }

    const transport = createTransport();
    const from =
        process.env.MAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        "Sunrise Parking <no-reply@sunrise-parking.local>";

    if (!transport) {
        console.log("[mail:preview]", { to, subject, text });
        return { previewOnly: true, provider: "PREVIEW" };
    }

    await transport.sendMail({
        attachments,
        from,
        html,
        subject,
        text,
        to,
    });

    return { previewOnly: false, provider: "SMTP" };
};

module.exports = {
    buildParkingMail,
    getFrontendUrl,
    sendMail,
};
