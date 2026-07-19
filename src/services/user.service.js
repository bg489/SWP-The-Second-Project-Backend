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

const findUserByEmail = async (email) => {
    const [rows] = await db.query(
        `SELECT *
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
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
            u.avatar_url AS avatarUrl,
            u.avatar_crop_x AS avatarCropX,
            u.avatar_crop_y AS avatarCropY,
            u.avatar_crop_zoom AS avatarCropZoom,
            u.email_notifications_enabled AS emailNotificationsEnabled,
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
            plate_image_url AS plateImageUrl,
            vehicle_portrait_image_url AS vehiclePortraitImageUrl,
            vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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
            u.email_notifications_enabled AS emailNotificationsEnabled,
            COUNT(v.id) AS vehicleCount,
            GROUP_CONCAT(
                DISTINCT CONCAT(v.plate_number, ' ', v.vehicle_type, ' ', v.status)
                ORDER BY v.id DESC
                SEPARATOR ', '
            ) AS vehicleSummary,
            u.created_at AS createdAt,
            u.updated_at AS updatedAt
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         LEFT JOIN vehicles v ON v.user_id = u.id
         ${whereSql}
         GROUP BY
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.status,
            u.building_id,
            u.email_notifications_enabled,
            b.name,
            b.address,
            u.created_at,
            u.updated_at
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

const getStaffCandidatesForBuilding = async ({ buildingId, q }) => {
    const conditions = [
        `u.role = ?`,
        `u.status = ?`,
        `(u.building_id IS NULL OR u.building_id = ?)`,
    ];
    const params = [ROLES.STAFF, USER_STATUSES.ACTIVE, buildingId];

    if (q) {
        conditions.push(`(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`);
        const keyword = `%${q}%`;
        params.push(keyword, keyword, keyword);
    }

    const [rows] = await db.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.status,
            u.building_id AS buildingId,
            u.avatar_url AS avatarUrl,
            u.avatar_crop_x AS avatarCropX,
            u.avatar_crop_y AS avatarCropY,
            u.avatar_crop_zoom AS avatarCropZoom,
            u.created_at AS createdAt,
            u.updated_at AS updatedAt,
            b.name AS buildingName,
            b.address AS buildingAddress
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY
            CASE WHEN u.building_id = ? THEN 0 ELSE 1 END,
            u.name ASC,
            u.id DESC`,
        [...params, buildingId]
    );

    return rows.map((row) => ({
        ...row,
        role: normalizeRole(row.role),
    }));
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

const updateUserBuilding = async ({ id, buildingId }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [buildingRows] = await connection.query(
            `SELECT id FROM buildings WHERE id = ? LIMIT 1`,
            [buildingId]
        );

        if (buildingRows.length === 0) {
            const error = new Error("Khong tim thay toa nha");
            error.statusCode = 404;
            throw error;
        }

        const [userRows] = await connection.query(
            `SELECT id FROM users WHERE id = ? LIMIT 1`,
            [id]
        );

        if (userRows.length === 0) {
            const error = new Error("Khong tim thay user");
            error.statusCode = 404;
            throw error;
        }

        await connection.query(
            `UPDATE users
             SET building_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [buildingId, id]
        );

        await connection.query(
            `UPDATE vehicles
             SET building_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [buildingId, id]
        );

        await connection.commit();

        return getUserById(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updateUserAvatar = async ({ id, avatarUrl }) => {
    await db.query(
        `UPDATE users
         SET avatar_url = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [avatarUrl || null, id]
    );

    return getUserById(id);
};

const updateUserPassword = async ({ id, passwordHash }) => {
    await db.query(
        `UPDATE users
         SET password_hash = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passwordHash, id]
    );

    return getUserById(id);
};

const updateUserProfile = async ({
    avatarCropX,
    avatarCropY,
    avatarCropZoom,
    avatarUrl,
    id,
    name,
    phone,
}) => {
    await db.query(
        `UPDATE users
         SET name = ?,
             phone = ?,
             avatar_url = COALESCE(?, avatar_url),
             avatar_crop_x = COALESCE(?, avatar_crop_x),
             avatar_crop_y = COALESCE(?, avatar_crop_y),
             avatar_crop_zoom = COALESCE(?, avatar_crop_zoom),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
            name,
            phone || null,
            avatarUrl === undefined ? null : avatarUrl || null,
            avatarCropX === undefined ? null : avatarCropX,
            avatarCropY === undefined ? null : avatarCropY,
            avatarCropZoom === undefined ? null : avatarCropZoom,
            id,
        ]
    );

    return getUserById(id);
};

const updateEmailNotifications = async ({ enabled, id }) => {
    await db.query(
        `UPDATE users
         SET email_notifications_enabled = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [enabled ? 1 : 0, id]
    );

    return getUserById(id);
};

module.exports = {
    findUserByEmailOrPhone,
    findUserByEmail,
    findExistingUserForRegister,
    createUser,
    getUserById,
    getVehiclesByUserId,
    getUsers,
    getAllUsers,
    getStaffCandidatesForBuilding,
    updateUserRole,
    updateUserRoleStatus,
    updateUserStatus,
    updateUserBuilding,
    updateUserAvatar,
    updateUserPassword,
    updateUserProfile,
    updateEmailNotifications,
};
