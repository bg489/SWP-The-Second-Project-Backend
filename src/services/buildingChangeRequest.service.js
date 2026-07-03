const db = require("../config/db");
const notificationService = require("./notification.service");

const requestSelect = `
    SELECT
        r.id,
        r.user_id AS userId,
        u.name AS userName,
        u.email AS userEmail,
        u.phone AS userPhone,

        r.current_building_id AS currentBuildingId,
        cb.name AS currentBuildingName,

        r.requested_building_id AS requestedBuildingId,
        rb.name AS requestedBuildingName,
        rb.address AS requestedBuildingAddress,

        r.reason,
        r.status,

        r.admin_id AS adminId,
        au.name AS adminName,
        r.admin_note AS adminNote,
        r.resolved_at AS resolvedAt,

        r.created_at AS createdAt,
        r.updated_at AS updatedAt
    FROM building_change_requests r
    INNER JOIN users u ON r.user_id = u.id
    LEFT JOIN buildings cb ON r.current_building_id = cb.id
    INNER JOIN buildings rb ON r.requested_building_id = rb.id
    LEFT JOIN users au ON r.admin_id = au.id
`;

const getBuildingById = async (id) => {
    const [rows] = await db.query(
        `SELECT id, name, address FROM buildings WHERE id = ? LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getUserById = async (id) => {
    const [rows] = await db.query(
        `SELECT id, building_id AS buildingId FROM users WHERE id = ? LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const findPendingRequestByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT id
         FROM building_change_requests
         WHERE user_id = ? AND status = 'PENDING'
         LIMIT 1`,
        [userId]
    );

    return rows[0] || null;
};

const getRequestById = async (id) => {
    const [rows] = await db.query(
        `${requestSelect}
         WHERE r.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getMyRequests = async (userId) => {
    const [rows] = await db.query(
        `${requestSelect}
         WHERE r.user_id = ?
         ORDER BY r.id DESC`,
        [userId]
    );

    return rows;
};

const getRequests = async ({ status, userId } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("r.status = ?");
        params.push(status);
    }

    if (userId) {
        conditions.push("r.user_id = ?");
        params.push(userId);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${requestSelect}
         ${whereSql}
         ORDER BY r.id DESC`,
        params
    );

    return rows;
};

const createRequest = async ({ userId, requestedBuildingId, reason }) => {
    const user = await getUserById(userId);

    if (!user) {
        const error = new Error("Khong tim thay user");
        error.statusCode = 404;
        throw error;
    }

    const requestedBuilding = await getBuildingById(requestedBuildingId);

    if (!requestedBuilding) {
        const error = new Error("Khong tim thay toa nha muon chuyen den");
        error.statusCode = 404;
        throw error;
    }

    if (Number(user.buildingId) === Number(requestedBuildingId)) {
        const error = new Error("Ban dang o toa nha nay roi");
        error.statusCode = 400;
        throw error;
    }

    const pendingRequest = await findPendingRequestByUserId(userId);

    if (pendingRequest) {
        const error = new Error("Ban dang co yeu cau doi toa nha cho duyet");
        error.statusCode = 400;
        throw error;
    }

    const [result] = await db.query(
        `INSERT INTO building_change_requests
            (user_id, current_building_id, requested_building_id, reason)
         VALUES (?, ?, ?, ?)`,
        [
            userId,
            user.buildingId || null,
            requestedBuildingId,
            reason || null,
        ]
    );

    return getRequestById(result.insertId);
};

const approveRequest = async ({ id, adminId, adminNote }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT *
             FROM building_change_requests
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );

        const request = rows[0];

        if (!request) {
            const error = new Error("Khong tim thay yeu cau");
            error.statusCode = 404;
            throw error;
        }

        if (request.status !== "PENDING") {
            const error = new Error("Yeu cau nay khong con o trang thai PENDING");
            error.statusCode = 400;
            throw error;
        }

        await connection.query(
            `UPDATE users
             SET building_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [request.requested_building_id, request.user_id]
        );

        await connection.query(
            `UPDATE vehicles
             SET building_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [request.requested_building_id, request.user_id]
        );

        await connection.query(
            `UPDATE building_change_requests
             SET status = 'APPROVED',
                 admin_id = ?,
                 admin_note = ?,
                 resolved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adminId, adminNote || null, id]
        );

        await connection.commit();

        const updatedRequest = await getRequestById(id);

        await notificationService.createNotification({
            userId: Number(request.user_id),
            title: "Yêu cầu đổi tòa đã được duyệt",
            message: `Yêu cầu chuyển sang ${updatedRequest?.requestedBuildingName || "tòa nhà mới"} đã được duyệt. Các mã QR cũ sẽ được kiểm tra theo tòa mới.`,
            relatedType: "BUILDING_CHANGE_REQUEST",
            relatedId: Number(id),
        });

        return updatedRequest;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const rejectRequest = async ({ id, adminId, adminNote }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT *
             FROM building_change_requests
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );

        const request = rows[0];

        if (!request) {
            const error = new Error("Khong tim thay yeu cau");
            error.statusCode = 404;
            throw error;
        }

        if (request.status !== "PENDING") {
            const error = new Error("Yeu cau nay khong con o trang thai PENDING");
            error.statusCode = 400;
            throw error;
        }

        await connection.query(
            `UPDATE building_change_requests
             SET status = 'REJECTED',
                 admin_id = ?,
                 admin_note = ?,
                 resolved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adminId, adminNote || null, id]
        );

        await connection.commit();

        const updatedRequest = await getRequestById(id);

        await notificationService.createNotification({
            userId: Number(request.user_id),
            title: "Yêu cầu đổi tòa bị từ chối",
            message: `Yêu cầu chuyển sang ${updatedRequest?.requestedBuildingName || "tòa nhà mới"} chưa được duyệt.${adminNote ? ` Ghi chú: ${adminNote}` : ""}`,
            relatedType: "BUILDING_CHANGE_REQUEST",
            relatedId: Number(id),
        });

        return updatedRequest;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    approveRequest,
    createRequest,
    getMyRequests,
    getRequestById,
    getRequests,
    rejectRequest,
};
