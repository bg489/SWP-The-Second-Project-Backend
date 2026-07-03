const getFrontendUrl = () =>
    (process.env.FRONTEND_URL || process.env.APP_FRONTEND_URL || "http://localhost:5173")
        .replace(/\/$/, "");

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

const buildParkingMail = ({ actionLabel, body, buttonLabel, buttonUrl, otp, title }) => {
    const buttonHtml = buttonUrl
        ? `<a href="${buttonUrl}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:linear-gradient(135deg,#ED9951,#FF6FD8);color:#fff;text-decoration:none;font-weight:800;">${buttonLabel || actionLabel}</a>`
        : "";
    const otpHtml = otp
        ? `<div style="margin:18px 0;padding:16px;border-radius:14px;background:#fff4fb;border:1px solid #ffd1f8;text-align:center;font-size:28px;letter-spacing:8px;font-weight:900;color:#241122;">${otp}</div>`
        : "";

    return `
        <div style="margin:0;padding:28px;background:#fff7fb;font-family:Arial,sans-serif;color:#241122;">
            <div style="max-width:620px;margin:auto;border-radius:22px;overflow:hidden;background:#fff;border:1px solid #f3d8e8;box-shadow:0 18px 50px rgba(237,153,81,.18);">
                <div style="padding:28px;background:linear-gradient(135deg,#FFB8F5,#ED9951);">
                    <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.45);font-weight:800;">Sunrise Parking</div>
                    <h1 style="margin:18px 0 0;font-size:28px;line-height:1.2;">${title}</h1>
                </div>
                <div style="padding:28px;">
                    <p style="font-size:16px;line-height:1.7;color:#60485b;">${body}</p>
                    ${otpHtml}
                    ${buttonHtml}
                    <p style="margin-top:24px;font-size:13px;line-height:1.6;color:#8a7083;">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này. Mã xác minh sẽ tự hết hạn.</p>
                </div>
            </div>
        </div>
    `;
};

const sendMail = async ({ html, subject, text, to }) => {
    const transport = createTransport();
    const from =
        process.env.MAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        "Sunrise Parking <no-reply@sunrise-parking.local>";

    if (!transport) {
        console.log("[mail:preview]", { to, subject, text });
        return { previewOnly: true };
    }

    await transport.sendMail({
        from,
        html,
        subject,
        text,
        to,
    });

    return { previewOnly: false };
};

module.exports = {
    buildParkingMail,
    getFrontendUrl,
    sendMail,
};
