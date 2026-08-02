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
        r.candidate_name AS candidateName,
        r.candidate_email AS candidateEmail,
        r.candidate_phone AS candidatePhone,
        COALESCE(u.name, r.candidate_name) AS userName,
        COALESCE(u.email, r.candidate_email) AS userEmail,
        COALESCE(u.phone, r.candidate_phone) AS userPhone,
        u.role AS userRole,
        u.status AS userStatus,
        u.avatar_url AS userAvatarUrl,
        u.created_at AS userCreatedAt,
        COALESCE((SELECT COUNT(*) FROM vehicles v WHERE v.user_id = u.id), 0) AS vehicleCount,

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
    LEFT JOIN users u ON r.user_id = u.id
    INNER JOIN buildings b ON r.building_id = b.id
    LEFT JOIN users a ON r.admin_id = a.id
    LEFT JOIN staff_profiles sp ON sp.user_id = r.user_id
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

const getManagerRequests = async ({ buildingId, managerId } = {}) => {
    await getManagerContext({ managerId });
    const conditions = ["r.manager_id = ?", "r.request_type = ?"];
    const params = [managerId, STAFF_ROLE_REQUEST_TYPES.CREATE_STAFF];

    if (buildingId) {
        conditions.push("r.building_id = ?");
        params.push(buildingId);
    }

    const [rows] = await db.query(
        `${requestSelect}
         WHERE ${conditions.join(" AND ")}
         ORDER BY r.id DESC`,
        params
    );

    return rows;
};

const getAdminRequests = async ({ status } = {}) => {
    const conditions = ["r.request_type = ?"];
    const params = [STAFF_ROLE_REQUEST_TYPES.CREATE_STAFF];

    if (status) {
        conditions.push("r.status = ?");
        params.push(status);
    }

    const [rows] = await db.query(
        `${requestSelect}
         WHERE ${conditions.join(" AND ")}
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
        console.error("[staff-account-request:notification]", error.message);
    }
};

const notifyActiveAdmins = async ({ managerName, requestId, staffName }) => {
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
                title: "Có đề nghị tạo tài khoản nhân viên mới",
                message: `${managerName} đề nghị tạo tài khoản Staff độc lập cho ${staffName}.`,
                relatedType: "STAFF_ROLE_REQUEST_ADMIN",
                relatedId: requestId,
            })
        )
    );
};

const createRequest = async ({
    buildingId,
    candidateEmail,
    candidateName,
    candidatePhone,
    managerId,
    managerNote,
    passwordHash,
    portraitImageUrl,
}) => {
    const connection = await db.getConnection();
    let manager;
    let requestId;

    try {
        await connection.beginTransaction();
        manager = await getManagerContext({
            executor: connection,
            managerId,
            lock: true,
        });
        await getBuilding({ buildingId, executor: connection });

        const accountParams = [candidateEmail];
        let phoneCondition = "";
        if (candidatePhone) {
            phoneCondition = " OR phone = ?";
            accountParams.push(candidatePhone);
        }

        const [existingAccounts] = await connection.query(
            `SELECT id, email, phone
             FROM users
             WHERE email = ?${phoneCondition}
             LIMIT 1
             FOR UPDATE`,
            accountParams
        );

        if (existingAccounts.length) {
            throw createHttpError("Email hoặc số điện thoại đã thuộc một tài khoản khác", 409);
        }

        const pendingParams = [candidateEmail];
        let pendingPhoneCondition = "";
        if (candidatePhone) {
            pendingPhoneCondition = " OR candidate_phone = ?";
            pendingParams.push(candidatePhone);
        }

        const [pendingRequests] = await connection.query(
            `SELECT id
             FROM staff_role_requests
             WHERE request_type = 'CREATE_STAFF'
               AND status = 'PENDING'
               AND (candidate_email = ?${pendingPhoneCondition})
             LIMIT 1
             FOR UPDATE`,
            pendingParams
        );

        if (pendingRequests.length) {
            throw createHttpError("Thông tin này đã có hồ sơ tạo Staff đang chờ duyệt", 409);
        }

        const [result] = await connection.query(
            `INSERT INTO staff_role_requests
                (manager_id, user_id, candidate_name, candidate_email,
                 candidate_phone, password_hash, building_id, request_type,
                 portrait_image_url, manager_note)
             VALUES (?, NULL, ?, ?, ?, ?, ?, 'CREATE_STAFF', ?, ?)`,
            [
                managerId,
                candidateName,
                candidateEmail,
                candidatePhone || null,
                passwordHash,
                buildingId,
                portraitImageUrl,
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
        staffName: candidateName,
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

        if (request.request_type !== STAFF_ROLE_REQUEST_TYPES.CREATE_STAFF) {
            throw createHttpError("Hồ sơ chuyển quyền cũ không còn được hỗ trợ", 409);
        }

        if (
            !request.candidate_name
            || !request.candidate_email
            || !request.password_hash
            || !request.portrait_image_url
        ) {
            throw createHttpError("Hồ sơ chưa đủ thông tin để tạo tài khoản Staff", 409);
        }

        const duplicateParams = [request.candidate_email];
        let phoneCondition = "";
        if (request.candidate_phone) {
            phoneCondition = " OR phone = ?";
            duplicateParams.push(request.candidate_phone);
        }
        const [duplicateUsers] = await connection.query(
            `SELECT id
             FROM users
             WHERE email = ?${phoneCondition}
             LIMIT 1
             FOR UPDATE`,
            duplicateParams
        );

        if (duplicateUsers.length) {
            throw createHttpError("Email hoặc số điện thoại đã được dùng trước khi hồ sơ được duyệt", 409);
        }

        const [userResult] = await connection.query(
            `INSERT INTO users
                (name, email, phone, password_hash, role, status, building_id,
                 email_verified_at, auth_provider, onboarding_completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'LOCAL', 1)`,
            [
                request.candidate_name,
                request.candidate_email,
                request.candidate_phone || null,
                request.password_hash,
                ROLES.STAFF,
                USER_STATUSES.ACTIVE,
                request.building_id,
            ]
        );
        const staffUserId = userResult.insertId;

        await connection.query(
            `INSERT INTO staff_profiles
                (user_id, building_id, portrait_image_url, status,
                 approved_request_id, approved_by, started_at, ended_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)`,
            [
                staffUserId,
                request.building_id,
                request.portrait_image_url,
                STAFF_PROFILE_STATUSES.ACTIVE,
                id,
                adminId,
            ]
        );

        await connection.query(
            `UPDATE staff_role_requests
             SET user_id = ?,
                 password_hash = NULL,
                 status = 'APPROVED',
                 admin_id = ?,
                 admin_note = ?,
                 reviewed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [staffUserId, adminId, adminNote || null, id]
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
            title: "Tài khoản nhân viên của bạn đã được tạo",
            message: `Bạn đã có tài khoản Staff độc lập tại ${request.buildingName}. Hãy đăng nhập bằng email đã đăng ký để bắt đầu làm việc.`,
            relatedType: "STAFF_ASSIGNMENT",
            relatedId: request.id,
        }),
        notifySafely({
            userId: request.managerId,
            title: "Đề nghị tạo tài khoản Staff đã được duyệt",
            message: `Tài khoản Staff độc lập cho ${request.userName} đã được tạo tại ${request.buildingName}.`,
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
             SET password_hash = NULL,
                 status = 'REJECTED',
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
        title: "Đề nghị tạo tài khoản Staff chưa được duyệt",
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
    getManagerRequests,
    getRequestById,
    getStaffProfileByUserId,
    getStaffProfiles,
    rejectRequest,
};
