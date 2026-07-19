const db = require("../config/db");
const notificationService = require("./notification.service");
const {
    ROLES,
    STAFF_PROFILE_STATUSES,
    STAFF_ROLE_REQUEST_STATUSES,
    STAFF_ROLE_REQUEST_TYPES,
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

        r.request_type AS requestType,
        r.portrait_image_url AS portraitImageUrl,
        sp.id AS staffProfileId,
        sp.portrait_image_url AS staffPortraitImageUrl,
        sp.status AS staffProfileStatus,
        sp.started_at AS staffStartedAt,
        sp.ended_at AS staffEndedAt,
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
    LEFT JOIN staff_profiles sp ON sp.user_id = u.id
`;

const staffProfileSelect = `
    SELECT
        sp.id AS profileId,
        u.id AS userId,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status AS userStatus,
        u.avatar_url AS avatarUrl,
        u.avatar_crop_x AS avatarCropX,
        u.avatar_crop_y AS avatarCropY,
        u.avatar_crop_zoom AS avatarCropZoom,
        u.created_at AS accountCreatedAt,
        u.updated_at AS accountUpdatedAt,
        u.building_id AS buildingId,
        b.name AS buildingName,
        b.address AS buildingAddress,
        sp.portrait_image_url AS portraitImageUrl,
        COALESCE(sp.status, 'ACTIVE') AS profileStatus,
        sp.started_at AS startedAt,
        sp.ended_at AS endedAt,
        sp.approved_request_id AS approvedRequestId,
        approval.manager_id AS proposedById,
        proposer.name AS proposedByName,
        approval.admin_id AS approvedById,
        approver.name AS approvedByName,
        approval.reviewed_at AS approvedAt,
        (SELECT COUNT(*) FROM vehicles v WHERE v.user_id = u.id) AS vehicleCount
    FROM users u
    INNER JOIN buildings b ON b.id = u.building_id
    LEFT JOIN staff_profiles sp ON sp.user_id = u.id
    LEFT JOIN staff_role_requests approval ON approval.id = sp.approved_request_id
    LEFT JOIN users proposer ON proposer.id = approval.manager_id
    LEFT JOIN users approver ON approver.id = approval.admin_id
`;

const createHttpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getManagerContext = async ({ executor = db, managerId, lock = false }) => {
    const [rows] = await executor.query(
        `SELECT id, name, email, phone, role, status
         FROM users
         WHERE id = ?
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

    return manager;
};

const getBuilding = async ({ buildingId, executor = db }) => {
    const [rows] = await executor.query(
        `SELECT id, name, address
         FROM buildings
         WHERE id = ?
         LIMIT 1`,
        [buildingId]
    );

    if (!rows[0]) {
        throw createHttpError("Không tìm thấy tòa nhà đã chọn", 404);
    }

    return rows[0];
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

const getManagerCandidates = async ({ buildingId, managerId, q, requestType }) => {
    await getManagerContext({ managerId });
    const building = await getBuilding({ buildingId });
    const expectedRole = requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
        ? ROLES.STAFF
        : ROLES.USER;
    const params = [buildingId, expectedRole, USER_STATUSES.ACTIVE];
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
            sp.id AS staffProfileId,
            sp.portrait_image_url AS staffPortraitImageUrl,
            sp.started_at AS staffStartedAt,
            COUNT(v.id) AS vehicleCount
         FROM users u
         INNER JOIN buildings b ON u.building_id = b.id
         LEFT JOIN vehicles v ON v.user_id = u.id
         LEFT JOIN staff_profiles sp ON sp.user_id = u.id
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
            u.building_id, b.name, b.address, u.avatar_url, u.created_at,
            sp.id, sp.portrait_image_url, sp.started_at
         ORDER BY u.name ASC, u.id DESC
         LIMIT 100`,
        params
    );

    return {
        building,
        requestType,
        users,
    };
};

const getManagerRequests = async ({ buildingId, managerId, requestType } = {}) => {
    await getManagerContext({ managerId });
    const conditions = ["r.manager_id = ?"];
    const params = [managerId];

    if (buildingId) {
        conditions.push("r.building_id = ?");
        params.push(buildingId);
    }

    if (requestType) {
        conditions.push("r.request_type = ?");
        params.push(requestType);
    }

    const [rows] = await db.query(
        `${requestSelect}
         WHERE ${conditions.join(" AND ")}
         ORDER BY r.id DESC`,
        params
    );

    return rows;
};

const getAdminRequests = async ({ requestType, status } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("r.status = ?");
        params.push(status);
    }

    if (requestType) {
        conditions.push("r.request_type = ?");
        params.push(requestType);
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

const notifyActiveAdmins = async ({ managerName, requestId, requestType, userName }) => {
    const [admins] = await db.query(
        `SELECT id
         FROM users
         WHERE role = ? AND status = ?`,
        [ROLES.ADMIN, USER_STATUSES.ACTIVE]
    );
    const isDemotion = requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE;

    await Promise.all(
        admins.map((admin) =>
            notifySafely({
                userId: admin.id,
                title: isDemotion
                    ? "Có đề nghị hủy quyền nhân viên mới"
                    : "Có đề nghị cấp quyền nhân viên mới",
                message: isDemotion
                    ? `${managerName} đề nghị chuyển ${userName} từ nhân viên về cư dân.`
                    : `${managerName} đề nghị duyệt ${userName} thành nhân viên bãi xe.`,
                relatedType: "STAFF_ROLE_REQUEST_ADMIN",
                relatedId: requestId,
            })
        )
    );
};

const createRequest = async ({
    buildingId,
    managerId,
    managerNote,
    portraitImageUrl,
    requestType,
    userId,
}) => {
    const connection = await db.getConnection();
    let manager;
    let user;
    let requestId;

    try {
        await connection.beginTransaction();
        manager = await getManagerContext({
            executor: connection,
            managerId,
            lock: true,
        });
        await getBuilding({ buildingId, executor: connection });

        const [userRows] = await connection.query(
            `SELECT id, name, email, phone, role, status, building_id AS buildingId
             FROM users
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );
        user = userRows[0];

        if (!user) {
            throw createHttpError("Không tìm thấy tài khoản được đề nghị", 404);
        }

        const expectedRole = requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
            ? ROLES.STAFF
            : ROLES.USER;
        const roleLabel = requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
            ? "nhân viên"
            : "cư dân";

        if (user.role !== expectedRole || user.status !== USER_STATUSES.ACTIVE) {
            throw createHttpError(`Tài khoản không còn là ${roleLabel} đang hoạt động`, 409);
        }

        if (Number(user.buildingId) !== Number(buildingId)) {
            throw createHttpError("Tài khoản không thuộc tòa nhà đã chọn", 409);
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
                (manager_id, user_id, building_id, request_type, portrait_image_url, manager_note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                managerId,
                userId,
                buildingId,
                requestType,
                requestType === STAFF_ROLE_REQUEST_TYPES.PROMOTE
                    ? portraitImageUrl
                    : null,
                managerNote || null,
            ]
        );
        requestId = result.insertId;

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    const request = await getRequestById(requestId);
    await notifyActiveAdmins({
        managerName: manager.name,
        requestId,
        requestType,
        userName: user.name,
    });

    return request;
};

const approveRequest = async ({ adminId, adminNote, id }) => {
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

        const requestType = request.request_type || STAFF_ROLE_REQUEST_TYPES.PROMOTE;
        const [userRows] = await connection.query(
            `SELECT id, role, status, building_id AS buildingId
             FROM users
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [request.user_id]
        );
        const user = userRows[0];

        if (!user) {
            throw createHttpError("Tài khoản trong hồ sơ không còn tồn tại", 404);
        }

        const expectedRole = requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE
            ? ROLES.STAFF
            : ROLES.USER;

        if (user.role !== expectedRole || user.status !== USER_STATUSES.ACTIVE) {
            throw createHttpError("Quyền hoặc trạng thái tài khoản đã thay đổi", 409);
        }

        if (Number(user.buildingId) !== Number(request.building_id)) {
            throw createHttpError("Tài khoản đã chuyển sang tòa nhà khác", 409);
        }

        if (requestType === STAFF_ROLE_REQUEST_TYPES.PROMOTE) {
            if (!request.portrait_image_url) {
                throw createHttpError("Hồ sơ bổ nhiệm không có ảnh chân dung", 409);
            }

            await connection.query(
                `UPDATE users
                 SET role = ?,
                     status = ?,
                     building_id = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [ROLES.STAFF, USER_STATUSES.ACTIVE, request.building_id, request.user_id]
            );

            await connection.query(
                `INSERT INTO staff_profiles
                    (user_id, building_id, portrait_image_url, status,
                     approved_request_id, approved_by, started_at, ended_at)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
                 ON DUPLICATE KEY UPDATE
                    building_id = VALUES(building_id),
                    portrait_image_url = VALUES(portrait_image_url),
                    status = VALUES(status),
                    approved_request_id = VALUES(approved_request_id),
                    approved_by = VALUES(approved_by),
                    started_at = CURRENT_TIMESTAMP,
                    ended_at = NULL,
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    request.user_id,
                    request.building_id,
                    request.portrait_image_url,
                    STAFF_PROFILE_STATUSES.ACTIVE,
                    id,
                    adminId,
                ]
            );
        } else {
            await connection.query(
                `UPDATE users
                 SET role = ?,
                     status = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [ROLES.USER, USER_STATUSES.ACTIVE, request.user_id]
            );

            await connection.query(
                `UPDATE staff_profiles
                 SET status = ?,
                     ended_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [STAFF_PROFILE_STATUSES.INACTIVE, request.user_id]
            );
        }

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
    const isDemotion = request.requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE;

    await Promise.all([
        notifySafely({
            userId: request.userId,
            title: isDemotion
                ? "Quyền nhân viên của bạn đã kết thúc"
                : "Bạn đã được duyệt làm nhân viên bãi xe",
            message: isDemotion
                ? `Tài khoản của bạn đã được chuyển về quyền cư dân tại ${request.buildingName}.`
                : `Tài khoản của bạn đã được cấp quyền nhân viên tại ${request.buildingName}. Ảnh chân dung được lưu trong hồ sơ nhân viên và không thay đổi ảnh đại diện cá nhân.`,
            relatedType: isDemotion ? "ACCOUNT" : "STAFF_ASSIGNMENT",
            relatedId: request.id,
        }),
        notifySafely({
            userId: request.managerId,
            title: isDemotion
                ? "Đề nghị hủy quyền nhân viên đã được duyệt"
                : "Đề nghị nhân viên đã được duyệt",
            message: isDemotion
                ? `${request.userName} đã được chuyển từ nhân viên về cư dân tại ${request.buildingName}.`
                : `${request.userName} đã được duyệt làm nhân viên tại ${request.buildingName}.`,
            relatedType: "STAFF_ROLE_REQUEST_MANAGER",
            relatedId: request.id,
        }),
    ]);

    return request;
};

const rejectRequest = async ({ adminId, adminNote, id }) => {
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
    const isDemotion = request.requestType === STAFF_ROLE_REQUEST_TYPES.DEMOTE;
    await notifySafely({
        userId: request.managerId,
        title: isDemotion
            ? "Đề nghị hủy quyền nhân viên chưa được duyệt"
            : "Đề nghị nhân viên chưa được duyệt",
        message: `Hồ sơ của ${request.userName} chưa được chấp thuận.${adminNote ? ` Lý do: ${adminNote}` : ""}`,
        relatedType: "STAFF_ROLE_REQUEST_MANAGER",
        relatedId: request.id,
    });

    return request;
};

const getStaffProfiles = async ({ buildingId, managerId, q }) => {
    await getManagerContext({ managerId });
    const building = await getBuilding({ buildingId });
    const params = [ROLES.STAFF, USER_STATUSES.ACTIVE, buildingId];
    let searchSql = "";

    if (q) {
        const keyword = `%${String(q).trim()}%`;
        searchSql = "AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        params.push(keyword, keyword, keyword);
    }

    const [profiles] = await db.query(
        `${staffProfileSelect}
         WHERE u.role = ?
           AND u.status = ?
           AND u.building_id = ?
           ${searchSql}
         ORDER BY u.name ASC, u.id DESC`,
        params
    );

    return { building, profiles };
};

const getStaffProfileByUserId = async ({ userId }) => {
    const [rows] = await db.query(
        `${staffProfileSelect}
         WHERE u.id = ?
           AND u.role = ?
           AND u.status = ?
         LIMIT 1`,
        [userId, ROLES.STAFF, USER_STATUSES.ACTIVE]
    );

    return rows[0] || null;
};

module.exports = {
    approveRequest,
    createRequest,
    getAdminRequests,
    getManagerCandidates,
    getManagerRequests,
    getRequestById,
    getStaffProfileByUserId,
    getStaffProfiles,
    rejectRequest,
};
