const db = require("../config/db");
const notificationService = require("./notification.service");

const WAIT_MINUTES = 15;

const caseSelect = `
    SELECT
        c.id,
        c.parking_session_id AS parkingSessionId,
        c.vehicle_id AS vehicleId,
        ps.plate_number AS plateNumber,
        ps.vehicle_type AS vehicleType,
        c.user_id AS userId,
        u.name AS userName,
        c.building_id AS buildingId,
        b.name AS buildingName,
        c.original_floor_id AS originalFloorId,
        ofl.name AS originalFloorName,
        ofl.floor_type AS originalFloorType,
        c.observed_floor_id AS observedFloorId,
        obsf.name AS observedFloorName,
        obsf.floor_type AS observedFloorType,
        c.original_slot_id AS originalSlotId,
        os.slot_code AS originalSlotCode,
        c.target_slot_id AS targetSlotId,
        ts.slot_code AS targetSlotCode,
        c.mismatch_type AS mismatchType,
        c.evidence_url AS evidenceUrl,
        c.note,
        c.status,
        c.notify_until AS notifyUntil,
        c.violation_id AS violationId,
        c.staff_id AS staffId,
        staff.name AS staffName,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
    FROM floor_mismatch_cases c
    INNER JOIN buildings b ON c.building_id = b.id
    INNER JOIN parking_sessions ps ON c.parking_session_id = ps.id
    INNER JOIN parking_floors ofl ON c.original_floor_id = ofl.id
    INNER JOIN parking_floors obsf ON c.observed_floor_id = obsf.id
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users staff ON c.staff_id = staff.id
    LEFT JOIN parking_slots os ON c.original_slot_id = os.id
    LEFT JOIN parking_slots ts ON c.target_slot_id = ts.id
`;

const getCaseById = async (id) => {
    const [rows] = await db.query(
        `${caseSelect}
         WHERE c.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getCases = async ({ buildingId, status } = {}) => {
    const conditions = [];
    const params = [];

    if (buildingId) {
        conditions.push("c.building_id = ?");
        params.push(buildingId);
    }

    if (status) {
        conditions.push("c.status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${caseSelect}
         ${whereSql}
         ORDER BY c.id DESC`,
        params
    );

    return rows;
};

const getActiveSessionForUpdate = async (connection, parkingSessionId) => {
    const [rows] = await connection.query(
        `SELECT
            id,
            user_id AS userId,
            vehicle_id AS vehicleId,
            building_id AS buildingId,
            floor_id AS floorId,
            slot_id AS slotId,
            plate_number AS plateNumber,
            vehicle_type AS vehicleType,
            pricing_type AS pricingType,
            status,
            note
         FROM parking_sessions
         WHERE id = ?
            AND status = 'ACTIVE'
         LIMIT 1
         FOR UPDATE`,
        [parkingSessionId]
    );

    return rows[0] || null;
};

const getObservedFloorForUpdate = async (connection, floorId) => {
    const [rows] = await connection.query(
        `SELECT
            id,
            building_id AS buildingId,
            name,
            floor_type AS floorType,
            status
         FROM parking_floors
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [floorId]
    );

    return rows[0] || null;
};

const getOrCreateViolationType = async ({
    connection,
    defaultPenaltyFee,
    description,
    name,
    staffId,
}) => {
    await connection.query(
        `INSERT INTO violation_types
            (name, default_penalty_fee, status, description, created_by)
         VALUES (?, ?, 'ACTIVE', ?, ?)
         ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            default_penalty_fee = IF(default_penalty_fee > 0, default_penalty_fee, VALUES(default_penalty_fee)),
            description = COALESCE(description, VALUES(description)),
            updated_at = CURRENT_TIMESTAMP`,
        [name, defaultPenaltyFee, description || null, staffId || null]
    );

    const [rows] = await connection.query(
        `SELECT id, name, default_penalty_fee AS defaultPenaltyFee
         FROM violation_types
         WHERE name = ?
         LIMIT 1`,
        [name]
    );

    return rows[0] || {
        id: null,
        name,
        defaultPenaltyFee,
    };
};

const createViolationForSession = async ({
    connection,
    defaultPenaltyFee,
    description,
    evidenceUrl,
    name,
    note,
    session,
    staffId,
}) => {
    const type = await getOrCreateViolationType({
        connection,
        defaultPenaltyFee,
        description,
        name,
        staffId,
    });

    const [result] = await connection.query(
        `INSERT INTO violations
            (
                parking_session_id,
                vehicle_id,
                violation_type_id,
                plate_number,
                vehicle_type,
                violation_type,
                staff_id,
                note,
                evidence_url,
                penalty_fee,
                status
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        [
            session.id,
            session.vehicleId || null,
            type.id,
            session.plateNumber,
            session.vehicleType,
            type.name,
            staffId,
            note || null,
            evidenceUrl || null,
            Number(type.defaultPenaltyFee || defaultPenaltyFee || 0),
        ]
    );

    return result.insertId;
};

const appendSessionNote = async ({ connection, message, sessionId }) => {
    await connection.query(
        `UPDATE parking_sessions
         SET note = TRIM(CONCAT(COALESCE(note, ''), IF(note IS NULL OR note = '', '', '\n'), ?)),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [message, sessionId]
    );
};

const findTargetCarSlot = async ({
    assignedSlotId,
    buildingId,
    connection,
    targetSlotId,
}) => {
    const requestedSlotId = targetSlotId || assignedSlotId;

    if (requestedSlotId) {
        const [rows] = await connection.query(
            `SELECT
                s.id,
                s.building_id AS buildingId,
                s.floor_id AS floorId,
                s.slot_code AS slotCode,
                s.status,
                f.floor_type AS floorType,
                f.status AS floorStatus
             FROM parking_slots s
             INNER JOIN parking_floors f ON s.floor_id = f.id
             WHERE s.id = ?
             LIMIT 1
             FOR UPDATE`,
            [requestedSlotId]
        );
        const slot = rows[0];

        if (!slot) {
            const error = new Error("Khong tim thay o oto duoc chi dinh");
            error.statusCode = 404;
            throw error;
        }

        if (Number(slot.buildingId) !== Number(buildingId)) {
            const error = new Error("O oto khong thuoc toa nha dang phu trach");
            error.statusCode = 400;
            throw error;
        }

        if (slot.floorType !== "CAR" || slot.floorStatus !== "ACTIVE") {
            const error = new Error("O duoc chi dinh phai thuoc tang oto dang hoat dong");
            error.statusCode = 400;
            throw error;
        }

        const isAssignedToSession =
            assignedSlotId && Number(slot.id) === Number(assignedSlotId);
        const canReuseAssignedSlot =
            isAssignedToSession && slot.status === "OCCUPIED";

        if (slot.status !== "AVAILABLE" && !canReuseAssignedSlot) {
            const error = new Error("O oto duoc chi dinh khong con trong");
            error.statusCode = 400;
            throw error;
        }

        return slot;
    }

    const [rows] = await connection.query(
        `SELECT
            s.id,
            s.building_id AS buildingId,
            s.floor_id AS floorId,
            s.slot_code AS slotCode,
            s.status,
            f.floor_type AS floorType
         FROM parking_slots s
         INNER JOIN parking_floors f ON s.floor_id = f.id
         WHERE s.building_id = ?
            AND s.status = 'AVAILABLE'
            AND f.floor_type = 'CAR'
            AND f.status = 'ACTIVE'
         ORDER BY s.id ASC
         LIMIT 1
         FOR UPDATE`,
        [buildingId]
    );

    if (!rows[0]) {
        const error = new Error("Khong con o oto trong de chi dinh");
        error.statusCode = 400;
        throw error;
    }

    return rows[0];
};

const notifyUser = async ({
    connection,
    evidenceUrl,
    message,
    relatedId,
    title,
    userId,
}) => {
    if (!userId) return;

    await notificationService.createNotification({
        connection,
        evidenceUrl,
        relatedId,
        relatedType: "FLOOR_MISMATCH_CASE",
        title,
        message,
        userId,
    });
};

const reportFloorMismatch = async ({
    evidenceUrl,
    note,
    observedFloorId,
    parkingSessionId,
    staffId,
    targetSlotId,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const session = await getActiveSessionForUpdate(connection, parkingSessionId);

        if (!session) {
            const error = new Error("Khong tim thay phien gui xe dang hoat dong");
            error.statusCode = 404;
            throw error;
        }

        const observedFloor = await getObservedFloorForUpdate(
            connection,
            observedFloorId
        );

        if (!observedFloor) {
            const error = new Error("Khong tim thay tang xe dang dau thuc te");
            error.statusCode = 404;
            throw error;
        }

        if (Number(observedFloor.buildingId) !== Number(session.buildingId)) {
            const error = new Error("Tang thuc te khong thuoc toa nha cua phien gui xe");
            error.statusCode = 400;
            throw error;
        }

        if (observedFloor.status !== "ACTIVE") {
            const error = new Error("Tang thuc te dang khong hoat dong");
            error.statusCode = 400;
            throw error;
        }

        if (observedFloor.floorType === session.vehicleType) {
            const error = new Error("Xe dang o dung khu theo loai xe");
            error.statusCode = 400;
            throw error;
        }

        if (session.vehicleType === "MOTORBIKE") {
            const violationId = await createViolationForSession({
                connection,
                defaultPenaltyFee: 70000,
                description: "Xe may vao khu do oto",
                evidenceUrl,
                name: "Xe may vao khu oto",
                note:
                    note ||
                    "Xe may vao tang oto; nhan vien dua xe vao goc an toan va khoa xe.",
                session,
                staffId,
            });

            const [result] = await connection.query(
                `INSERT INTO floor_mismatch_cases
                    (
                        parking_session_id,
                        vehicle_id,
                        user_id,
                        building_id,
                        original_floor_id,
                        observed_floor_id,
                        original_slot_id,
                        mismatch_type,
                        evidence_url,
                        note,
                        status,
                        violation_id,
                        staff_id
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'MOTORBIKE_IN_CAR_FLOOR', ?, ?, 'LOCKED_AND_PENALIZED', ?, ?)`,
                [
                    session.id,
                    session.vehicleId || null,
                    session.userId || null,
                    session.buildingId,
                    session.floorId,
                    observedFloor.id,
                    session.slotId || null,
                    evidenceUrl || null,
                    note || null,
                    violationId,
                    staffId,
                ]
            );

            await appendSessionNote({
                connection,
                message:
                    "Xe may vao khu oto; nhan vien da dua xe vao goc an toan, khoa xe va ghi nhan phi phat.",
                sessionId: session.id,
            });

            await notifyUser({
                connection,
                evidenceUrl,
                relatedId: result.insertId,
                title: "Xe may vao sai khu do",
                message:
                    "Xe cua ban dang o khu oto. Nhan vien da dua xe vao vi tri an toan, khoa xe va ghi nhan phi phat. Phi se duoc cong khi xe ra bai.",
                userId: session.userId,
            });

            await connection.commit();
            return getCaseById(result.insertId);
        }

        const targetSlot = await findTargetCarSlot({
            assignedSlotId: session.slotId,
            buildingId: session.buildingId,
            connection,
            targetSlotId,
        });

        await connection.query(
            `UPDATE parking_slots
             SET status = 'LOCKED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [targetSlot.id]
        );

        const [result] = await connection.query(
            `INSERT INTO floor_mismatch_cases
                (
                    parking_session_id,
                    vehicle_id,
                    user_id,
                    building_id,
                    original_floor_id,
                    observed_floor_id,
                    original_slot_id,
                    target_slot_id,
                    mismatch_type,
                    evidence_url,
                    note,
                    status,
                    notify_until,
                    staff_id
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CAR_IN_MOTORBIKE_FLOOR', ?, ?, 'WAITING_USER', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), ?)`,
            [
                session.id,
                session.vehicleId || null,
                session.userId || null,
                session.buildingId,
                session.floorId,
                observedFloor.id,
                session.slotId || null,
                targetSlot.id,
                evidenceUrl || null,
                note || null,
                WAIT_MINUTES,
                staffId,
            ]
        );

        await notifyUser({
            connection,
            evidenceUrl,
            relatedId: result.insertId,
            title: "Can doi oto khoi khu xe may",
            message: `Oto cua ban dang o khu xe may. Vui long lien he nhan vien de doi xe trong ${WAIT_MINUTES} phut. Qua thoi gian nay xe se duoc dua ve o ${targetSlot.slotCode} va phat sinh phi.`,
            userId: session.userId,
        });

        await connection.commit();
        return getCaseById(result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const confirmFloorMismatch = async ({ force, id, staffId }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [caseRows] = await connection.query(
            `SELECT *
             FROM floor_mismatch_cases
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );
        const floorCase = caseRows[0];

        if (!floorCase) {
            const error = new Error("Khong tim thay ca sai khu do");
            error.statusCode = 404;
            throw error;
        }

        if (floorCase.status !== "WAITING_USER") {
            const error = new Error("Ca nay khong con cho xu ly");
            error.statusCode = 400;
            throw error;
        }

        const deadline = floorCase.notify_until
            ? new Date(floorCase.notify_until).getTime()
            : 0;

        if (!force && deadline > Date.now()) {
            const error = new Error("Chua qua 15 phut cho user phan hoi");
            error.statusCode = 400;
            throw error;
        }

        const session = await getActiveSessionForUpdate(
            connection,
            floorCase.parking_session_id
        );

        if (!session) {
            const error = new Error("Khong tim thay phien gui xe dang hoat dong");
            error.statusCode = 404;
            throw error;
        }

        if (floorCase.mismatch_type !== "CAR_IN_MOTORBIKE_FLOOR") {
            const error = new Error("Ca nay khong can keo xe");
            error.statusCode = 400;
            throw error;
        }

        const [slotRows] = await connection.query(
            `SELECT
                s.id,
                s.floor_id AS floorId,
                s.slot_code AS slotCode,
                s.status,
                f.floor_type AS floorType
             FROM parking_slots s
             INNER JOIN parking_floors f ON s.floor_id = f.id
             WHERE s.id = ?
             LIMIT 1
             FOR UPDATE`,
            [floorCase.target_slot_id]
        );
        const targetSlot = slotRows[0];

        if (!targetSlot || targetSlot.floorType !== "CAR") {
            const error = new Error("O oto chi dinh khong hop le");
            error.statusCode = 400;
            throw error;
        }

        if (!["LOCKED", "AVAILABLE"].includes(targetSlot.status)) {
            const error = new Error("O oto chi dinh da duoc su dung");
            error.statusCode = 400;
            throw error;
        }

        const violationId = await createViolationForSession({
            connection,
            defaultPenaltyFee: 250000,
            description: "Oto vao khu xe may va phai keo ve o chi dinh",
            evidenceUrl: floorCase.evidence_url || null,
            name: "Keo oto do sai khu",
            note:
                floorCase.note ||
                "Oto vao tang xe may, qua thoi gian phan hoi nen duoc keo ve o chi dinh.",
            session,
            staffId,
        });

        if (
            floorCase.original_slot_id &&
            Number(floorCase.original_slot_id) !== Number(targetSlot.id)
        ) {
            const originalSlotStatus =
                session.pricingType === "MONTHLY_PASS" ? "RESERVED" : "AVAILABLE";

            await connection.query(
                `UPDATE parking_slots
                 SET status = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [originalSlotStatus, floorCase.original_slot_id]
            );
        }

        await connection.query(
            `UPDATE parking_slots
             SET status = 'OCCUPIED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [targetSlot.id]
        );

        await connection.query(
            `UPDATE parking_sessions
             SET floor_id = ?,
                 slot_id = ?,
                 note = TRIM(CONCAT(COALESCE(note, ''), IF(note IS NULL OR note = '', '', '\n'), ?)),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                targetSlot.floorId,
                targetSlot.id,
                `Oto bi keo ve o ${targetSlot.slotCode} do dau sai khu.`,
                session.id,
            ]
        );

        await connection.query(
            `UPDATE floor_mismatch_cases
             SET status = 'TOWED',
                 violation_id = ?,
                 staff_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [violationId, staffId, floorCase.id]
        );

        await notifyUser({
            connection,
            evidenceUrl: floorCase.evidence_url || null,
            relatedId: floorCase.id,
            title: "Oto da duoc dua ve o chi dinh",
            message: `Oto cua ban da duoc dua ve o ${targetSlot.slotCode}. Chi phi xu ly se duoc cong khi xe ra bai.`,
            userId: session.userId,
        });

        await connection.commit();
        return getCaseById(floorCase.id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const restoreTemporarySlotAfterCheckout = async ({ connection, session }) => {
    if (!session?.id || session.vehicleType !== "CAR") {
        return [];
    }

    const executor = connection || db;
    const [caseRows] = await executor.query(
        `SELECT
            c.id,
            c.user_id AS userId,
            c.original_slot_id AS originalSlotId,
            c.target_slot_id AS targetSlotId,
            ts.slot_code AS targetSlotCode,
            os.slot_code AS originalSlotCode
         FROM floor_mismatch_cases c
         LEFT JOIN parking_slots ts ON c.target_slot_id = ts.id
         LEFT JOIN parking_slots os ON c.original_slot_id = os.id
         WHERE c.parking_session_id = ?
            AND c.status = 'TOWED'
            AND c.target_slot_id IS NOT NULL`,
        [session.id]
    );

    const restored = [];

    for (const floorCase of caseRows) {
        await executor.query(
            `UPDATE parking_slots
             SET status = 'AVAILABLE',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
                AND status IN ('OCCUPIED', 'RESERVED', 'LOCKED')`,
            [floorCase.targetSlotId]
        );

        if (
            session.pricingType === "MONTHLY_PASS" &&
            floorCase.originalSlotId &&
            Number(floorCase.originalSlotId) !== Number(floorCase.targetSlotId)
        ) {
            await executor.query(
                `UPDATE parking_slots
                 SET status = 'RESERVED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [floorCase.originalSlotId]
            );
        }

        await notifyUser({
            connection: executor,
            relatedId: floorCase.id,
            title: "O tam da duoc tra lai",
            message:
                floorCase.originalSlotCode && session.pricingType === "MONTHLY_PASS"
                    ? `Xe da roi bai. O dang ky ${floorCase.originalSlotCode} van duoc giu cho ban.`
                    : "Xe da roi bai va o tam da duoc tra ve trang thai trong.",
            userId: floorCase.userId,
        });

        restored.push({
            caseId: floorCase.id,
            originalSlotCode: floorCase.originalSlotCode,
            targetSlotCode: floorCase.targetSlotCode,
        });
    }

    return restored;
};

module.exports = {
    confirmFloorMismatch,
    getCaseById,
    getCases,
    reportFloorMismatch,
    restoreTemporarySlotAfterCheckout,
};
