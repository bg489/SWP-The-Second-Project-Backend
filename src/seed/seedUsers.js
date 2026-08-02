/**
 * @fileoverview Tạo dữ liệu khởi đầu phục vụ chạy thử hệ thống cho nhóm seedUsers.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `path` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedUsers.js.
 */
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    override: true,
});

/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedUsers.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedUsers.js.
 */
const db = require("../config/db");

/**
 * Khai báo `DEFAULT_PASSWORD` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/seed/seedUsers.js.
 */
const DEFAULT_PASSWORD = "123456";

/**
 * Khai báo `testUsers` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/seed/seedUsers.js.
 */
const testUsers = [
    {
        name: "Admin Test",
        email: "admin@test.com",
        phone: "0900000000",
        role: "ADMIN",
    },
    {
        name: "Parking Manager Test",
        email: "manager@test.com",
        phone: "0900000004",
        role: "MANAGER",
    },
    {
        name: "Parking Staff Test",
        email: "staff@test.com",
        phone: "0900000005",
        role: "STAFF",
    },
    {
        name: "User No Vehicle",
        email: "novehicle@test.com",
        phone: "0900000001",
        role: "USER",
    },
    {
        name: "User Demo One",
        email: "user1@test.com",
        phone: "0900000002",
        role: "USER",
    },
    {
        name: "User Demo Two",
        email: "user2@test.com",
        phone: "0900000003",
        role: "USER",
    },
];

/**
 * Thực hiện nghiệp vụ `ensureDefaultBuilding` (ensure default building). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function ensureDefaultBuilding
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const ensureDefaultBuilding = async () => {
    const [rows] = await db.query(
        `SELECT id
         FROM buildings
         WHERE name = ?
         LIMIT 1`,
        ["FPT Parking Building"]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const [result] = await db.query(
        `INSERT INTO buildings (name, address)
         VALUES (?, ?)`,
        ["FPT Parking Building", "Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM"]
    );

    return result.insertId;
};

/**
 * Thực hiện nghiệp vụ `upsertUser` (upsert user). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function upsertUser
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const upsertUser = async ({ name, email, phone, role, buildingId }) => {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const [existingRows] = await db.query(
        `SELECT id
         FROM users
         WHERE email = ? OR phone = ?
         LIMIT 1`,
        [email, phone]
    );

    if (existingRows.length > 0) {
        const userId = existingRows[0].id;

        await db.query(
            `UPDATE users
             SET
                name = ?,
                email = ?,
                phone = ?,
                password_hash = ?,
                role = ?,
                status = 'ACTIVE',
                building_id = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, email, phone, passwordHash, role, buildingId, userId]
        );

        return userId;
    }

    const [result] = await db.query(
        `INSERT INTO users
            (name, email, phone, password_hash, role, status, building_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, passwordHash, role, "ACTIVE", buildingId]
    );

    return result.insertId;
};

/**
 * Thực hiện nghiệp vụ `seedUsers` (seed users). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function seedUsers
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const seedUsers = async () => {
    try {
        console.log("Seeding test users...");

        const buildingId = await ensureDefaultBuilding();

        for (const user of testUsers) {
            const userId = await upsertUser({
                ...user,
                buildingId,
            });

            console.log(`Seeded user: ${user.email} | id=${userId}`);
        }

        const [noVehicleUserRows] = await db.query(
            `SELECT id
             FROM users
             WHERE email = ?
             LIMIT 1`,
            ["novehicle@test.com"]
        );

        if (noVehicleUserRows.length > 0) {
            const noVehicleUserId = noVehicleUserRows[0].id;

            await db.query(
                `DELETE FROM vehicles
                 WHERE user_id = ?`,
                [noVehicleUserId]
            );

            console.log(
                "Ensured novehicle@test.com has 0 vehicles for empty vehicle list test."
            );
        }

        console.log("Seed users completed successfully.");
        console.log("Default password for all test users: 123456");

        process.exit(0);
    } catch (error) {
        console.error("Seed users failed:", error.message);
        process.exit(1);
    }
};

seedUsers();
