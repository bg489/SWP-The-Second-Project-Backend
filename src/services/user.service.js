const db = require("../config/db");
const { ROLES, USER_STATUSES, normalizeRole } = require("../utils/constants");

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
        `INSERT INTO users
            (name, email, phone, password_hash, role, status, building_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            name,
            email,
            phone || null,
            passwordHash,
            ROLES.USER,
            USER_STATUSES.PENDING,
            buildingId || null,
        ]
    );

    return {
        id: result.insertId,
        name,
        email,
        phone: phone || null,
        role: ROLES.USER,
        status: USER_STATUSES.PENDING,
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
            u.status,
            u.building_id AS buildingId,
            u.created_at AS createdAt,
            u.updated_at AS updatedAt,
            b.name AS buildingName,
            b.address AS buildingAddress
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         WHERE u.id = ?
         LIMIT 1`,
        [id]
    );

    if (!rows[0]) {
        return null;
    }

    return {
        ...rows[0],
        role: normalizeRole(rows[0].role),
    };
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

const buildUserFilters = ({ q, role, status }) => {
    const conditions = [];
    const params = [];

    if (q) {
        conditions.push(`(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`);
        const keyword = `%${q}%`;
        params.push(keyword, keyword, keyword);
    }

    if (role) {
        conditions.push(`u.role = ?`);
        params.push(normalizeRole(role));
    }

    if (status) {
        conditions.push(`u.status = ?`);
        params.push(status);
    }

    return {
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
};

const getUsers = async ({ q, role, status, page = 1, limit = 10 }) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const { whereSql, params } = buildUserFilters({ q, role, status });

    const [rows] = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.status,
            u.building_id AS buildingId,
            b.name AS buildingName,
            b.address AS buildingAddress,
            u.created_at AS createdAt,
            u.updated_at AS updatedAt
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         ${whereSql}
         ORDER BY u.id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
    );

    const [countRows] = await db.query(
        `SELECT COUNT(*) AS total
         FROM users u
         ${whereSql}`,
        params
    );

    return {
        users: rows.map((row) => ({
            ...row,
            role: normalizeRole(row.role),
        })),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: countRows[0].total,
            totalPages: Math.ceil(countRows[0].total / safeLimit),
        },
    };
};

const getAllUsers = async () => {
    const result = await getUsers({ page: 1, limit: 100 });
    return result.users;
};

const updateUserRole = async (id, role) => {
    await db.query(
        `UPDATE users
         SET role = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [normalizeRole(role), id]
    );

    return getUserById(id);
};

const updateUserRoleStatus = async ({ id, role, status }) => {
    await db.query(
        `UPDATE users
         SET role = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [normalizeRole(role), status, id]
    );

    return getUserById(id);
};

const updateUserStatus = async ({ id, status }) => {
    await db.query(
        `UPDATE users
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, id]
    );

    return getUserById(id);
};

module.exports = {
    findUserByEmailOrPhone,
    findExistingUserForRegister,
    createUser,
    getUserById,
    getVehiclesByUserId,
    getUsers,
    getAllUsers,
    updateUserRole,
    updateUserRoleStatus,
    updateUserStatus,
};
