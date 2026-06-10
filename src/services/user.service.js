const db = require("../config/db");

const findUserByEmailOrPhone = async (emailOrPhone) => {
    const [rows] = await db.query(
        `SELECT *
         FROM users
         WHERE email = ? OR phone = ?
         LIMIT 1`,
        [emailOrPhone, emailOrPhone]
    );

    return rows[0] || null;
};

const findExistingUserForRegister = async (email, phone) => {
    if (phone) {
        const [rows] = await db.query(
            `SELECT *
             FROM users
             WHERE email = ? OR phone = ?
             LIMIT 1`,
            [email, phone]
        );

        return rows[0] || null;
    }

    const [rows] = await db.query(
        `SELECT *
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
};

const createUser = async ({ name, email, phone, passwordHash, buildingId }) => {
    const [result] = await db.query(
        `INSERT INTO users (name, email, phone, password_hash, building_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, email, phone || null, passwordHash, buildingId || null]
    );

    return {
        id: result.insertId,
        name,
        email,
        phone: phone || null,
        role: "USER",
        buildingId: buildingId || null,
    };
};

const getUserById = async (id) => {
    const [rows] = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.building_id AS buildingId,
            u.created_at AS createdAt,
            b.name AS buildingName,
            b.address AS buildingAddress
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         WHERE u.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getAllUsers = async () => {
    const [rows] = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.building_id AS buildingId,
            u.created_at AS createdAt,
            u.updated_at AS updatedAt,
            b.name AS buildingName,
            b.address AS buildingAddress
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         ORDER BY u.id DESC`
    );

    return rows;
};

const updateUserRole = async (id, role) => {
    await db.query(
        `UPDATE users
         SET role = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [role, id]
    );

    return getUserById(id);
};

const getVehiclesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT
            id,
            plate_number AS plateNumber,
            vehicle_type AS vehicleType,
            brand,
            color,
            status,
            created_at AS createdAt
         FROM vehicles
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userId]
    );

    return rows;
};

module.exports = {
    findUserByEmailOrPhone,
    findExistingUserForRegister,
    createUser,
    getUserById,
    getAllUsers,
    updateUserRole,
    getVehiclesByUserId,
};
