/**
 * @fileoverview Tạo dữ liệu khởi đầu phục vụ chạy thử hệ thống cho nhóm seedVehicles.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `path` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedVehicles.js.
 */
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    override: true,
});

/**
 * Khai báo `bcrypt` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedVehicles.js.
 */
const bcrypt = require("bcryptjs");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/seed/seedVehicles.js.
 */
const db = require("../config/db");

/**
 * Khai báo `DEFAULT_PASSWORD` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/seed/seedVehicles.js.
 */
const DEFAULT_PASSWORD = "123456";

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
 * Thực hiện nghiệp vụ `ensureUser` (ensure user). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function ensureUser
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const ensureUser = async ({ name, email, phone, role, buildingId }) => {
    const [rows] = await db.query(
        `SELECT id
         FROM users
         WHERE email = ? OR phone = ?
         LIMIT 1`,
        [email, phone]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const [result] = await db.query(
        `INSERT INTO users
            (name, email, phone, password_hash, role, status, building_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, passwordHash, role, "ACTIVE", buildingId]
    );

    return result.insertId;
};

/**
 * Tạo nghiệp vụ `insertVehicle` (insert vehicle). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function insertVehicle
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const insertVehicle = async ({
    userId,
    buildingId,
    plateNumber,
    vehicleType,
    brand,
    color,
    status,
}) => {
    const [result] = await db.query(
        `INSERT INTO vehicles
            (user_id, building_id, plate_number, vehicle_type, brand, color, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            buildingId,
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
            status || "PENDING",
        ]
    );

    return result.insertId;
};

/**
 * Thực hiện nghiệp vụ `seedVehicles` (seed vehicles). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function seedVehicles
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const seedVehicles = async () => {
    try {
        console.log("Seeding test vehicles...");

        const buildingId = await ensureDefaultBuilding();

        const noVehicleUserId = await ensureUser({
            name: "User No Vehicle",
            email: "novehicle@test.com",
            phone: "0900000001",
            role: "USER",
            buildingId,
        });

        const oneVehicleUserId = await ensureUser({
            name: "User Demo One",
            email: "user1@test.com",
            phone: "0900000002",
            role: "USER",
            buildingId,
        });

        const multiVehicleUserId = await ensureUser({
            name: "User Demo Two",
            email: "user2@test.com",
            phone: "0900000003",
            role: "USER",
            buildingId,
        });

        const seedPlateNumbers = [
            "59-M1-11111",
            "59-M2-22222",
            "59A-33333",
        ];

        await db.query(
            `DELETE FROM vehicles
             WHERE plate_number IN (?, ?, ?)`,
            seedPlateNumbers
        );

        await db.query(
            `DELETE FROM vehicles
             WHERE user_id IN (?, ?, ?)`,
            [noVehicleUserId, oneVehicleUserId, multiVehicleUserId]
        );

        console.log("Cleared old seed vehicles.");

        console.log("Case 1: novehicle@test.com has 0 vehicles.");

        const vehicleOneId = await insertVehicle({
            userId: oneVehicleUserId,
            buildingId,
            plateNumber: "59-M1-11111",
            vehicleType: "MOTORBIKE",
            brand: "Honda Vision",
            color: "Black",
            status: "PENDING",
        });

        console.log(
            `Case 2: user1@test.com has 1 vehicle. vehicleId=${vehicleOneId}`
        );

        const motorbikeId = await insertVehicle({
            userId: multiVehicleUserId,
            buildingId,
            plateNumber: "59-M2-22222",
            vehicleType: "MOTORBIKE",
            brand: "Yamaha Sirius",
            color: "Red",
            status: "APPROVED",
        });

        const carId = await insertVehicle({
            userId: multiVehicleUserId,
            buildingId,
            plateNumber: "59A-33333",
            vehicleType: "CAR",
            brand: "Toyota Vios",
            color: "White",
            status: "PENDING",
        });

        console.log(
            `Case 3: user2@test.com has multiple vehicles. motorbikeId=${motorbikeId}, carId=${carId}`
        );

        console.log("Seed vehicles completed successfully.");
        console.log("Login password for all test users: 123456");

        process.exit(0);
    } catch (error) {
        console.error("Seed vehicles failed:", error.message);
        process.exit(1);
    }
};

seedVehicles();