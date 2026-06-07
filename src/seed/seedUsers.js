const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    override: true,
});

const bcrypt = require("bcryptjs");
const db = require("../config/db");

const DEFAULT_PASSWORD = "123456";

const testUsers = [
    {
        name: "Admin Test",
        email: "admin@test.com",
        phone: "0900000000",
        role: "ADMIN",
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
                building_id = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, email, phone, passwordHash, role, buildingId, userId]
        );

        return userId;
    }

    const [result] = await db.query(
        `INSERT INTO users
            (name, email, phone, password_hash, role, building_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, phone, passwordHash, role, buildingId]
    );

    return result.insertId;
};

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