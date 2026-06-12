const crypto = require("crypto");
const db = require("../config/db");

const qrPassSelect = `
    SELECT
        qp.id,
        qp.user_id AS userId,
        u.name AS ownerName,
        qp.vehicle_id AS vehicleId,
        v.plate_number AS plateNumber,
        v.vehicle_type AS vehicleType,
        v.status AS vehicleStatus,
        qp.monthly_pass_id AS monthlyPassId,
        qp.slot_registration_id AS slotRegistrationId,
        qp.qr_code AS qrCode,
        qp.pass_type AS passType,
        qp.status,
        qp.valid_from AS validFrom,
        qp.valid_to AS validTo,
        qp.created_by AS createdBy,
        qp.note,
        qp.created_at AS createdAt,
        qp.updated_at AS updatedAt
    FROM qr_passes qp
    INNER JOIN vehicles v ON qp.vehicle_id = v.id
    LEFT JOIN users u ON qp.user_id = u.id
`;

const generateQrCode = (prefix = "QR") => {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const getMonthlyPassForQr = async (monthlyPassId) => {
    const [rows] = await db.query(
        `SELECT
            mp.id,
            mp.user_id AS userId,
            mp.vehicle_id AS vehicleId,
            mp.status,
            mp.start_date AS startDate,
            mp.end_date AS endDate,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status AS vehicleStatus
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         WHERE mp.id = ?
         LIMIT 1`,
        [monthlyPassId]
    );

    return rows[0] || null;
};

const getSlotRegistrationForQr = async (slotRegistrationId) => {
    const [rows] = await db.query(
        `SELECT
            sr.id,
            sr.user_id AS userId,
            sr.vehicle_id AS vehicleId,
            sr.status,
            sr.start_date AS startDate,
            sr.end_date AS endDate,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status AS vehicleStatus
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         WHERE sr.id = ?
         LIMIT 1`,
        [slotRegistrationId]
    );

    return rows[0] || null;
};

const formatDateOnly = (date) => {
    if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
    }

    return String(date).slice(0, 10);
};

const buildValidDateTime = (date, endOfDay = false) => {
    const suffix = endOfDay ? " 23:59:59" : " 00:00:00";
    return `${formatDateOnly(date)}${suffix}`;
};

const createQrPassForMonthlyPass = async ({ createdBy, monthlyPassId, note }) => {
    const monthlyPass = await getMonthlyPassForQr(monthlyPassId);

    if (!monthlyPass) {
        const error = new Error("Khong tim thay the thang");
        error.statusCode = 404;
        throw error;
    }

    if (monthlyPass.status !== "ACTIVE") {
        const error = new Error("The thang phai ACTIVE moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    if (monthlyPass.vehicleStatus !== "APPROVED") {
        const error = new Error("Xe phai duoc duyet moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    const qrCode = generateQrCode("MONTHLY");

    await db.query(
        `INSERT INTO qr_passes
            (
                user_id,
                vehicle_id,
                monthly_pass_id,
                qr_code,
                pass_type,
                status,
                valid_from,
                valid_to,
                created_by,
                note
            )
         VALUES (?, ?, ?, ?, 'MONTHLY', 'ACTIVE', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            valid_from = VALUES(valid_from),
            valid_to = VALUES(valid_to),
            created_by = VALUES(created_by),
            note = VALUES(note),
            updated_at = CURRENT_TIMESTAMP`,
        [
            monthlyPass.userId || null,
            monthlyPass.vehicleId,
            monthlyPass.id,
            qrCode,
            buildValidDateTime(monthlyPass.startDate),
            buildValidDateTime(monthlyPass.endDate, true),
            createdBy || null,
            note || null,
        ]
    );

    return getQrPassByMonthlyPassId(monthlyPassId);
};

const createQrPassForSlotRegistration = async ({
    createdBy,
    note,
    slotRegistrationId,
}) => {
    const registration = await getSlotRegistrationForQr(slotRegistrationId);

    if (!registration) {
        const error = new Error("Khong tim thay dang ky slot");
        error.statusCode = 404;
        throw error;
    }

    if (registration.status !== "PAID") {
        const error = new Error("Dang ky slot phai PAID moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    if (registration.vehicleStatus !== "APPROVED") {
        const error = new Error("Xe phai duoc duyet moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    const qrCode = generateQrCode("SLOT");

    await db.query(
        `INSERT INTO qr_passes
            (
                user_id,
                vehicle_id,
                slot_registration_id,
                qr_code,
                pass_type,
                status,
                valid_from,
                valid_to,
                created_by,
                note
            )
         VALUES (?, ?, ?, ?, 'SLOT_REGISTRATION', 'ACTIVE', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            valid_from = VALUES(valid_from),
            valid_to = VALUES(valid_to),
            created_by = VALUES(created_by),
            note = VALUES(note),
            updated_at = CURRENT_TIMESTAMP`,
        [
            registration.userId || null,
            registration.vehicleId,
            registration.id,
            qrCode,
            buildValidDateTime(registration.startDate),
            buildValidDateTime(registration.endDate, true),
            createdBy || null,
            note || null,
        ]
    );

    return getQrPassBySlotRegistrationId(slotRegistrationId);
};

const getQrPassByMonthlyPassId = async (monthlyPassId) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.monthly_pass_id = ?
         LIMIT 1`,
        [monthlyPassId]
    );

    return rows[0] || null;
};

const getQrPassBySlotRegistrationId = async (slotRegistrationId) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.slot_registration_id = ?
         LIMIT 1`,
        [slotRegistrationId]
    );

    return rows[0] || null;
};

const getQrPassById = async (id) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getQrPasses = async ({ passType, status, userId, vehicleId } = {}) => {
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push("qp.user_id = ?");
        params.push(userId);
    }

    if (vehicleId) {
        conditions.push("qp.vehicle_id = ?");
        params.push(vehicleId);
    }

    if (passType) {
        conditions.push("qp.pass_type = ?");
        params.push(passType);
    }

    if (status) {
        conditions.push("qp.status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${qrPassSelect}
         ${whereSql}
         ORDER BY qp.id DESC`,
        params
    );

    return rows;
};

const getQrPassByCode = async (qrCode) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.qr_code = ?
         LIMIT 1`,
        [qrCode]
    );

    return rows[0] || null;
};

const validateQrPass = async (qrCode) => {
    const qrPass = await getQrPassByCode(qrCode);

    if (!qrPass) {
        return {
            isValid: false,
            reason: "QR_NOT_FOUND",
            message: "Khong tim thay QR pass",
        };
    }

    const now = new Date();
    const validFrom = new Date(qrPass.validFrom);
    const validTo = new Date(qrPass.validTo);

    if (qrPass.vehicleStatus !== "APPROVED") {
        return {
            isValid: false,
            reason: "VEHICLE_NOT_APPROVED",
            message: "Xe chua duoc duyet",
            qrPass,
        };
    }

    if (qrPass.status !== "ACTIVE") {
        return {
            isValid: false,
            reason: "QR_NOT_ACTIVE",
            message: "QR pass khong o trang thai ACTIVE",
            qrPass,
        };
    }

    if (qrPass.passType === "MONTHLY") {
        const monthlyPass = await getMonthlyPassForQr(qrPass.monthlyPassId);

        if (!monthlyPass || monthlyPass.status !== "ACTIVE") {
            return {
                isValid: false,
                reason: "MONTHLY_PASS_NOT_ACTIVE",
                message: "The thang gan voi QR khong con ACTIVE",
                qrPass,
            };
        }
    }

    if (qrPass.passType === "SLOT_REGISTRATION") {
        const registration = await getSlotRegistrationForQr(qrPass.slotRegistrationId);

        if (!registration || registration.status !== "PAID") {
            return {
                isValid: false,
                reason: "SLOT_REGISTRATION_NOT_PAID",
                message: "Dang ky slot gan voi QR chua thanh toan hoac khong con hieu luc",
                qrPass,
            };
        }
    }

    if (now < validFrom || now > validTo) {
        return {
            isValid: false,
            reason: "QR_EXPIRED_OR_NOT_STARTED",
            message: "QR pass het han hoac chua den ngay hieu luc",
            qrPass,
        };
    }

    return {
        isValid: true,
        reason: "VALID",
        message: "QR pass hop le",
        qrPass,
    };
};

const updateQrPassStatus = async ({ id, note, status }) => {
    await db.query(
        `UPDATE qr_passes
         SET status = ?,
             note = COALESCE(?, note),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, note || null, id]
    );

    return getQrPassById(id);
};

module.exports = {
    createQrPassForMonthlyPass,
    createQrPassForSlotRegistration,
    generateQrCode,
    getMonthlyPassForQr,
    getQrPassByCode,
    getQrPassById,
    getQrPassByMonthlyPassId,
    getQrPassBySlotRegistrationId,
    getQrPasses,
    getSlotRegistrationForQr,
    updateQrPassStatus,
    validateQrPass,
};
