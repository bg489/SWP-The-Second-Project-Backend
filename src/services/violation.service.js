const db = require("../config/db");

const violationSelect = `
    SELECT
        v.id,
        v.parking_session_id AS parkingSessionId,
        v.vehicle_id AS vehicleId,
        v.violation_type_id AS violationTypeId,
        vt.name AS violationTypeName,
        vt.default_penalty_fee AS violationTypeDefaultPenaltyFee,
        v.plate_number AS plateNumber,
        v.vehicle_type AS vehicleType,
        v.violation_type AS violationType,
        v.detected_at AS detectedAt,
        v.staff_id AS staffId,
        u.name AS staffName,
        v.note,
        v.evidence_url AS evidenceUrl,
        v.penalty_fee AS penaltyFee,
        v.status,
        v.collected_payment_id AS collectedPaymentId,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt
    FROM violations v
    INNER JOIN users u ON v.staff_id = u.id
    LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
`;

const createViolation = async ({
    detectedAt,
    evidenceUrl,
    note,
    parkingSessionId,
    penaltyFee,
    plateNumber,
    staffId,
    status,
    vehicleId,
    vehicleType,
    violationType,
    violationTypeId,
}) => {
    const [result] = await db.query(
        `INSERT INTO violations
            (
                parking_session_id,
                vehicle_id,
                violation_type_id,
                plate_number,
                vehicle_type,
                violation_type,
                detected_at,
                staff_id,
                note,
                evidence_url,
                penalty_fee,
                status
            )
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?)`,
        [
            parkingSessionId || null,
            vehicleId || null,
            violationTypeId || null,
            plateNumber,
            vehicleType,
            violationType,
            detectedAt || null,
            staffId,
            note || null,
            evidenceUrl || null,
            penaltyFee || 0,
            status || "OPEN",
        ]
    );

    return getViolationById(result.insertId);
};

const getViolations = async ({
    from,
    parkingSessionId,
    plateNumber,
    status,
    to,
    vehicleType,
} = {}) => {
    const conditions = [];
    const params = [];

    if (parkingSessionId) {
        conditions.push("v.parking_session_id = ?");
        params.push(parkingSessionId);
    }

    if (plateNumber) {
        conditions.push("v.plate_number = ?");
        params.push(plateNumber);
    }

    if (vehicleType) {
        conditions.push("v.vehicle_type = ?");
        params.push(vehicleType);
    }

    if (status) {
        conditions.push("v.status = ?");
        params.push(status);
    }

    if (from) {
        conditions.push("v.detected_at >= ?");
        params.push(from);
    }

    if (to) {
        conditions.push("v.detected_at <= ?");
        params.push(to);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${violationSelect}
         ${whereSql}
         ORDER BY v.detected_at DESC, v.id DESC`,
        params
    );

    return rows;
};

const getViolationById = async (id) => {
    const [rows] = await db.query(
        `${violationSelect}
         WHERE v.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const updateViolationStatus = async ({ id, note, status }) => {
    await db.query(
        `UPDATE violations
         SET status = ?,
             note = COALESCE(?, note),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, note || null, id]
    );

    return getViolationById(id);
};

const getCollectableViolationsForSession = async (session) => {
    const [rows] = await db.query(
        `${violationSelect}
         WHERE v.status IN ('OPEN', 'RESOLVED')
            AND (
                v.parking_session_id = ?
                OR (
                    v.parking_session_id IS NULL
                    AND v.plate_number = ?
                    AND v.vehicle_type = ?
                )
            )
         ORDER BY v.detected_at ASC, v.id ASC`,
        [session.id, session.plateNumber, session.vehicleType]
    );

    const totalFee = rows.reduce(
        (sum, violation) => sum + Number(violation.penaltyFee || 0),
        0
    );

    return {
        totalFee,
        violationIds: rows.map((violation) => violation.id),
        violations: rows,
    };
};

const markViolationsCollected = async ({ connection, paymentId, session }) => {
    const executor = connection || db;

    await executor.query(
        `UPDATE violations
         SET status = 'COLLECTED',
             collected_payment_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE status IN ('OPEN', 'RESOLVED')
            AND (
                parking_session_id = ?
                OR (
                    parking_session_id IS NULL
                    AND plate_number = ?
                    AND vehicle_type = ?
                )
            )`,
        [paymentId || null, session.id, session.plateNumber, session.vehicleType]
    );
};

module.exports = {
    createViolation,
    getCollectableViolationsForSession,
    getViolationById,
    getViolations,
    markViolationsCollected,
    updateViolationStatus,
};
