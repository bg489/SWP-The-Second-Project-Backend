/**
 * @fileoverview Kiểm tra luồng Admin tạo tài khoản và gửi thông tin đăng nhập.
 */
const assert = require("node:assert/strict");
const test = require("node:test");

const adminUserController = require("./adminUser.controller");
const emailService = require("../services/email.service");
const userService = require("../services/user.service");

test("emails credentials after an admin creates an account", async () => {
    const originalCreateUser = userService.createAdminManagedUser;
    const originalBuildMail = emailService.buildAdminAccountMail;
    const originalSendMail = emailService.sendMail;
    let accountMailInput;
    let sendMailInput;

    userService.createAdminManagedUser = async () => ({
        id: 91,
        email: "manager.demo@gmail.com",
        name: "Manager Demo",
        role: "MANAGER",
        status: "ACTIVE",
    });
    emailService.buildAdminAccountMail = (input) => {
        accountMailInput = input;
        return {
            html: "<p>Account</p>",
            subject: "Account",
            text: "Account",
        };
    };
    emailService.sendMail = async (input) => {
        sendMailInput = input;
        return { previewOnly: false, provider: "GMAIL_API" };
    };

    const response = {
        body: null,
        statusCode: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return payload;
        },
    };

    try {
        await adminUserController.createUser(
            {
                body: {
                    email: "manager.demo@gmail.com",
                    name: "Manager Demo",
                    password: "Secret123",
                    role: "MANAGER",
                },
                user: { id: 1 },
            },
            response
        );

        assert.equal(response.statusCode, 201);
        assert.equal(response.body.success, true);
        assert.equal(response.body.data.accountEmailNotification.sent, true);
        assert.deepEqual(accountMailInput, {
            email: "manager.demo@gmail.com",
            name: "Manager Demo",
            password: "Secret123",
            role: "MANAGER",
        });
        assert.equal(sendMailInput.to, "manager.demo@gmail.com");
    } finally {
        userService.createAdminManagedUser = originalCreateUser;
        emailService.buildAdminAccountMail = originalBuildMail;
        emailService.sendMail = originalSendMail;
    }
});
