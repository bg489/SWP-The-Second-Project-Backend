/**
 * @fileoverview Kiểm tra nội dung email thông tin đăng nhập do Admin tạo.
 */
const assert = require("node:assert/strict");
const test = require("node:test");

const { buildAdminAccountMail } = require("./email.service");

test("builds an admin-created account email with escaped credentials", () => {
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = "http://localhost:5173";

    try {
        const mail = buildAdminAccountMail({
            email: "new.user@gmail.com",
            name: "Nguyễn Văn An",
            password: "P@ss<123>&",
            role: "USER",
        });

        assert.match(mail.subject, /Thông tin tài khoản/);
        assert.match(mail.text, /new\.user@gmail\.com/);
        assert.match(mail.text, /P@ss<123>&/);
        assert.match(mail.text, /Vai trò: USER/);
        assert.match(mail.html, /P@ss&lt;123&gt;&amp;/);
        assert.match(mail.html, /http:\/\/localhost:5173\/login/);
        assert.doesNotMatch(mail.html, /P@ss<123>&/);
    } finally {
        if (previousFrontendUrl === undefined) {
            delete process.env.FRONTEND_URL;
        } else {
            process.env.FRONTEND_URL = previousFrontendUrl;
        }
    }
});
