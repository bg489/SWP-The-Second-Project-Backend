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
        mp.package_plan_id AS packagePlanId,
        pp.name AS packagePlanName,
        COALESCE(mp.amount, sr.amount) AS amount,
        COALESCE(mp.building_id, sr.building_id) AS buildingId,
        b.name AS buildingName,
        mp.start_date AS monthlyPassStartDate,
        mp.end_date AS monthlyPassEndDate,
        sr.slot_id AS slotId,
        ps.floor_id AS slotFloorId,
        ps.slot_code AS slotCode,
        qp.valid_from AS validFrom,
        qp.valid_to AS validTo,
        qp.created_by AS createdBy,
        qp.note,
        qp.created_at AS createdAt,
        qp.updated_at AS updatedAt
    FROM qr_passes qp
    INNER JOIN vehicles v ON qp.vehicle_id = v.id
    LEFT JOIN users u ON qp.user_id = u.id
    LEFT JOIN monthly_passes mp ON qp.monthly_pass_id = mp.id
    LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
    LEFT JOIN slot_registrations sr ON qp.slot_registration_id = sr.id
    LEFT JOIN parking_slots ps ON sr.slot_id = ps.id
    LEFT JOIN buildings b ON COALESCE(mp.building_id, sr.building_id) = b.id
`;

const generateQrCode = (prefix = "QR") => {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const normalizePlateCode = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s.-]/g, "");

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

const ensureQrPassesForUser = async (userId) => {
    const [monthlyRows] = await db.query(
        `SELECT mp.id
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.monthly_pass_id = mp.id
         WHERE mp.user_id = ?
            AND mp.status = 'ACTIVE'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL`,
        [userId]
    );

    for (const row of monthlyRows) {
        await createQrPassForMonthlyPass({
            createdBy: userId,
            monthlyPassId: row.id,
            note: "Auto generated when user opens monthly pass QR page",
        });
    }

    const [slotRows] = await db.query(
        `SELECT sr.id
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.slot_registration_id = sr.id
         WHERE sr.user_id = ?
            AND sr.status = 'PAID'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL`,
        [userId]
    );

    for (const row of slotRows) {
        await createQrPassForSlotRegistration({
            createdBy: userId,
            note: "Auto generated when user opens monthly pass QR page",
            slotRegistrationId: row.id,
        });
    }
};

const getQrPassByCode = async (qrCode) => {
    const rawCode = String(qrCode || "").trim();

    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.qr_code = ?
         LIMIT 1`,
        [rawCode]
    );

    if (rows[0]) {
        return rows[0];
    }

    const plateCode = normalizePlateCode(rawCode);

    if (!plateCode) {
        return null;
    }

    const [plateRows] = await db.query(
        `${qrPassSelect}
         WHERE REPLACE(REPLACE(REPLACE(UPPER(v.plate_number), '-', ''), '.', ''), ' ', '') = ?
         ORDER BY
            CASE qp.status WHEN 'ACTIVE' THEN 0 ELSE 1 END,
            qp.valid_to DESC,
            qp.id DESC
         LIMIT 1`,
        [plateCode]
    );

    return plateRows[0] || null;
};

const validateQrPass = async (qrCode, { buildingId } = {}) => {
    const qrPass = await getQrPassByCode(qrCode);

    if (!qrPass) {
        return {
            isValid: false,
            reason: "QR_NOT_FOUND",
            message: "Không tìm thấy mã QR.",
        };
    }

    const now = new Date();
    const validFrom = new Date(qrPass.validFrom);
    const validTo = new Date(qrPass.validTo);

    if (
        buildingId &&
        qrPass.buildingId &&
        Number(qrPass.buildingId) !== Number(buildingId)
    ) {
        return {
            isValid: false,
            reason: "QR_BUILDING_MISMATCH",
            message: "Mã QR này thuộc tòa nhà khác.",
            qrPass,
        };
    }

    if (qrPass.vehicleStatus !== "APPROVED") {
            return {
                isValid: false,
                reason: "VEHICLE_NOT_APPROVED",
                message: "Xe chưa được duyệt.",
                qrPass,
            };
    }

    if (qrPass.status !== "ACTIVE") {
            return {
                isValid: false,
                reason: "QR_NOT_ACTIVE",
                message: "Mã QR chưa sẵn sàng sử dụng.",
                qrPass,
            };
    }

    if (qrPass.passType === "MONTHLY") {
        const monthlyPass = await getMonthlyPassForQr(qrPass.monthlyPassId);

        if (!monthlyPass || monthlyPass.status !== "ACTIVE") {
                return {
                    isValid: false,
                    reason: "MONTHLY_PASS_NOT_ACTIVE",
                    message: "Gói tháng gắn với mã QR không còn hiệu lực.",
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
                message: "Gói ô tô gắn với mã QR chưa thanh toán hoặc không còn hiệu lực.",
                qrPass,
            };
        }
    }

    if (now < validFrom || now > validTo) {
        return {
            isValid: false,
            reason: "QR_EXPIRED_OR_NOT_STARTED",
            message: "Mã QR hết hạn hoặc chưa đến ngày hiệu lực.",
            qrPass,
        };
    }

    return {
        isValid: true,
        reason: "VALID",
        message: "Mã QR hợp lệ.",
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
    ensureQrPassesForUser,
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
