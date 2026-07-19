const db = require("../config/db");
const notificationService = require("./notification.service");
const {
    ROLES,
    STAFF_ROLE_REQUEST_STATUSES,
    USER_STATUSES,
} = require("../utils/constants");

const requestSelect = `
    SELECT
        r.id,
        r.manager_id AS managerId,
        m.name AS managerName,
        m.email AS managerEmail,
        m.phone AS managerPhone,
        m.avatar_url AS managerAvatarUrl,

        r.user_id AS userId,
        u.name AS userName,
        u.email AS userEmail,
        u.phone AS userPhone,
        u.role AS userRole,
        u.status AS userStatus,
        u.avatar_url AS userAvatarUrl,
        u.created_at AS userCreatedAt,
        (SELECT COUNT(*) FROM vehicles v WHERE v.user_id = u.id) AS vehicleCount,

        r.building_id AS buildingId,
        b.name AS buildingName,
        b.address AS buildingAddress,

        r.portrait_image_url AS portraitImageUrl,
        r.manager_note AS managerNote,
        r.status,
        r.admin_id AS adminId,
        a.name AS adminName,
        r.admin_note AS adminNote,
        r.reviewed_at AS reviewedAt,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt
    FROM staff_role_requests r
    INNER JOIN users m ON r.manager_id = m.id
    INNER JOIN users u ON r.user_id = u.id
    INNER JOIN buildings b ON r.building_id = b.id
    LEFT JOIN users a ON r.admin_id = a.id
`;

const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getManagerContext = async ({ executor = db, managerId, lock = false }) => {
    const [rows] = await executor.query(
        `SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.status,
            u.building_id AS buildingId,
            b.name AS buildingName,
            b.address AS buildingAddress
         FROM users u
         LEFT JOIN buildings b ON u.building_id = b.id
         WHERE u.id = ?
         LIMIT 1${lock ? " FOR UPDATE" : ""}`,
        [managerId]
    );

    const manager = rows[0] || null;

    if (!manager || manager.role !== ROLES.MANAGER) {
        throw createHttpError("Không tìm thấy tài khoản quản lý hợp lệ", 403);
    }

    if (manager.status !== USER_STATUSES.ACTIVE) {
        throw createHttpError("Tài khoản quản lý không còn hoạt động", 403);
    }

    if (!manager.buildingId) {
        throw createHttpError("Tài khoản quản lý chưa được gán tòa nhà", 400);
    }

    return manager;
};

const getRequestById = async (id, executor = db) => {
    const [rows] = await executor.query(
        `${requestSelect}
         WHERE r.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getManagerCandidates = async ({ managerId, q }) => {
    const manager = await getManagerContext({ managerId });
    const params = [manager.buildingId, ROLES.USER, USER_STATUSES.ACTIVE];
    let searchSql = "";

    if (q) {
        const keyword = `%${String(q).trim()}%`;
        searchSql = "AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        params.push(keyword, keyword, keyword);
    }

    const [users] = await db.query(
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
            u.avatar_url AS avatarUrl,
            u.created_at AS createdAt,
            COUNT(v.id) AS vehicleCount
         FROM users u
         INNER JOIN buildings b ON u.building_id = b.id
         LEFT JOIN vehicles v ON v.user_id = u.id
         WHERE u.building_id = ?
           AND u.role = ?
           AND u.status = ?
           ${searchSql}
           AND NOT EXISTS (
               SELECT 1
               FROM staff_role_requests pending
               WHERE pending.user_id = u.id
                 AND pending.status = 'PENDING'
           )
         GROUP BY
            u.id, u.name, u.email, u.phone, u.role, u.status,
            u.building_id, b.name, b.address, u.avatar_url, u.created_at
         ORDER BY u.name ASC, u.id DESC
         LIMIT 100`,
        params
    );

    return {
        building: {
            id: manager.buildingId,
            name: manager.buildingName,
            address: manager.buildingAddress,
        },
        users,
    };
};

const getManagerRequests = async (managerId) => {
    await getManagerContext({ managerId });

    const [rows] = await db.query(
        `${requestSelect}
         WHERE r.manager_id = ?
         ORDER BY r.id DESC`,
        [managerId]
    );

    return rows;
};

const getAdminRequests = async ({ status } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("r.status = ?");
        params.push(status);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
        `${requestSelect}
         ${whereSql}
         ORDER BY
            CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
            r.id DESC`,
        params
    );

    return rows;
};

const notifySafely = async (payload) => {
    try {
        await notificationService.createNotification(payload);
    } catch (error) {
        console.error("[staff-role-request:notification]", error.message);
    }
};

const notifyActiveAdmins = async ({ requestId, managerName, userName }) => {
    const [admins] = await db.query(
        `SELECT id
         FROM users
         WHERE role = ? AND status = ?`,
        [ROLES.ADMIN, USER_STATUSES.ACTIVE]
    );

    await Promise.all(
        admins.map((admin) =>
            notifySafely({
                userId: admin.id,
                title: "Có đề nghị cấp quyền nhân viên mới",
                message: `${managerName} đề nghị duyệt ${userName} thành nhân viên bãi xe.`,
                relatedType: "STAFF_ROLE_REQUEST_ADMIN",
                relatedId: requestId,
            })
        )
    );
};

const createRequest = async ({ managerId, userId, portraitImageUrl, managerNote }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const manager = await getManagerContext({
            executor: connection,
            managerId,
            lock: true,
        });
        const [userRows] = await connection.query(
            `SELECT id, name, email, phone, role, status, building_id AS buildingId
             FROM users
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );
        const user = userRows[0];

        if (!user) {
            throw createHttpError("Không tìm thấy tài khoản được đề nghị", 404);
        }

        if (user.role !== ROLES.USER || user.status !== USER_STATUSES.ACTIVE) {
            throw createHttpError("Chỉ có thể đề nghị tài khoản cư dân đã được duyệt", 400);
        }

        if (Number(user.buildingId) !== Number(manager.buildingId)) {
            throw createHttpError("Tài khoản này không thuộc tòa nhà bạn đang quản lý", 403);
        }

        const [pendingRows] = await connection.query(
            `SELECT id
             FROM staff_role_requests
             WHERE user_id = ? AND status = 'PENDING'
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );

        if (pendingRows.length) {
            throw createHttpError("Tài khoản này đã có hồ sơ đang chờ duyệt", 409);
        }

        const [result] = await connection.query(
            `INSERT INTO staff_role_requests
                (manager_id, user_id, building_id, portrait_image_url, manager_note)
             VALUES (?, ?, ?, ?, ?)`,
            [
                managerId,
                userId,
                manager.buildingId,
                portraitImageUrl,
                managerNote || null,
            ]
        );

        await connection.commit();

        const request = await getRequestById(result.insertId);
        await notifyActiveAdmins({
            requestId: request.id,
            managerName: manager.name,
            userName: user.name,
        });

        return request;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const approveRequest = async ({ id, adminId, adminNote }) => {
    const connection = await db.getConnection();
    let lockedRequest;

    try {
        await connection.beginTransaction();

        const [requestRows] = await connection.query(
            `SELECT *
             FROM staff_role_requests
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );
        lockedRequest = requestRows[0];

        if (!lockedRequest) {
            throw createHttpError("Không tìm thấy hồ sơ đề nghị", 404);
        }

        if (lockedRequest.status !== STAFF_ROLE_REQUEST_STATUSES.PENDING) {
            throw createHttpError("Hồ sơ này đã được xử lý", 409);
        }

        const [userRows] = await connection.query(
            `SELECT id, role, status, building_id AS buildingId
             FROM users
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [lockedRequest.user_id]
        );
        const user = userRows[0];

        if (!user) {
            throw createHttpError("Tài khoản trong hồ sơ không còn tồn tại", 404);
        }

        if (user.role !== ROLES.USER || user.status !== USER_STATUSES.ACTIVE) {
            throw createHttpError("Tài khoản không còn đủ điều kiện cấp quyền nhân viên", 409);
        }

        if (Number(user.buildingId) !== Number(lockedRequest.building_id)) {
            throw createHttpError("Tài khoản đã chuyển sang tòa nhà khác", 409);
        }

        await connection.query(
            `UPDATE users
             SET role = ?,
                 status = ?,
                 building_id = ?,
                 avatar_url = ?,
                 avatar_crop_x = 50,
                 avatar_crop_y = 50,
                 avatar_crop_zoom = 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                ROLES.STAFF,
                USER_STATUSES.ACTIVE,
                lockedRequest.building_id,
                lockedRequest.portrait_image_url,
                lockedRequest.user_id,
            ]
        );

        await connection.query(
            `UPDATE staff_role_requests
             SET status = 'APPROVED',
                 admin_id = ?,
                 admin_note = ?,
                 reviewed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adminId, adminNote || null, id]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    const request = await getRequestById(id);
    await Promise.all([
        notifySafely({
            userId: request.userId,
            title: "Bạn đã được duyệt làm nhân viên bãi xe",
            message: `Tài khoản của bạn đã được cấp quyền nhân viên tại ${request.buildingName}. Ảnh chân dung trong hồ sơ đã trở thành ảnh đại diện của bạn.`,
            relatedType: "STAFF_ASSIGNMENT",
            relatedId: request.id,
        }),
        notifySafely({
            userId: request.managerId,
            title: "Đề nghị nhân viên đã được duyệt",
            message: `${request.userName} đã được duyệt làm nhân viên tại ${request.buildingName}.`,
            relatedType: "STAFF_ROLE_REQUEST_MANAGER",
            relatedId: request.id,
        }),
    ]);

    return request;
};

const rejectRequest = async ({ id, adminId, adminNote }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [requestRows] = await connection.query(
            `SELECT *
             FROM staff_role_requests
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );
        const request = requestRows[0];

        if (!request) {
            throw createHttpError("Không tìm thấy hồ sơ đề nghị", 404);
        }

        if (request.status !== STAFF_ROLE_REQUEST_STATUSES.PENDING) {
            throw createHttpError("Hồ sơ này đã được xử lý", 409);
        }

        await connection.query(
            `UPDATE staff_role_requests
             SET status = 'REJECTED',
                 admin_id = ?,
                 admin_note = ?,
                 reviewed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adminId, adminNote || null, id]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    const request = await getRequestById(id);
    await notifySafely({
        userId: request.managerId,
        title: "Đề nghị nhân viên chưa được duyệt",
        message: `Hồ sơ của ${request.userName} chưa được chấp thuận.${adminNote ? ` Lý do: ${adminNote}` : ""}`,
        relatedType: "STAFF_ROLE_REQUEST_MANAGER",
        relatedId: request.id,
    });

    return request;
};

module.exports = {
    approveRequest,
    createRequest,
    getAdminRequests,
    getManagerCandidates,
    getManagerRequests,
    getRequestById,
    rejectRequest,
};
