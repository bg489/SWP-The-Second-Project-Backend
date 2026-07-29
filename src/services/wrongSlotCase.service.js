const db = require("../config/db");
const notificationService = require("./notification.service");

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
        c.original_slot_id AS originalSlotId,
        os.slot_code AS originalSlotCode,
        c.observed_slot_id AS observedSlotId,
        obs.slot_code AS observedSlotCode,
        c.reserved_registration_id AS reservedRegistrationId,
        rr.user_id AS reservedUserId,
        reservedUser.name AS reservedUserName,
        rv.plate_number AS reservedPlateNumber,
        c.reassigned_slot_id AS reassignedSlotId,
        rs.slot_code AS reassignedSlotCode,
        rr.slot_id AS reservedCurrentSlotId,
        currentReservedSlot.slot_code AS reservedCurrentSlotCode,
        c.restoration_status AS restorationStatus,
        c.evidence_url AS evidenceUrl,
        c.note,
        c.status,
        c.notify_until AS notifyUntil,
        c.violation_id AS violationId,
        c.staff_id AS staffId,
        staff.name AS staffName,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
    FROM wrong_slot_cases c
    INNER JOIN buildings b ON c.building_id = b.id
    INNER JOIN parking_sessions ps ON c.parking_session_id = ps.id
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN users staff ON c.staff_id = staff.id
    LEFT JOIN parking_slots os ON c.original_slot_id = os.id
    INNER JOIN parking_slots obs ON c.observed_slot_id = obs.id
    LEFT JOIN slot_registrations rr ON c.reserved_registration_id = rr.id
    LEFT JOIN vehicles rv ON rr.vehicle_id = rv.id
    LEFT JOIN users reservedUser ON rr.user_id = reservedUser.id
    LEFT JOIN parking_slots currentReservedSlot ON rr.slot_id = currentReservedSlot.id
    LEFT JOIN parking_slots rs ON c.reassigned_slot_id = rs.id
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

const getCases = async ({ buildingId, status, userId } = {}) => {
    await processExpiredWrongSlotCases({ buildingId });

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

    if (userId) {
        conditions.push("(c.user_id = ? OR rr.user_id = ?)");
        params.push(userId, userId);
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

const getReservedRegistrationBySlot = async (executor, slotId) => {
    const [rows] = await executor.query(
        `SELECT
            r.id,
            r.user_id AS userId,
            r.vehicle_id AS vehicleId,
            r.building_id AS buildingId,
            r.floor_id AS floorId,
            r.slot_id AS slotId,
            v.plate_number AS plateNumber
         FROM slot_registrations r
         INNER JOIN vehicles v ON r.vehicle_id = v.id
         WHERE r.slot_id = ?
            AND r.status IN ('PENDING_PAYMENT', 'PAID')
         ORDER BY FIELD(r.status, 'PAID', 'PENDING_PAYMENT'), r.id DESC
         LIMIT 1
         FOR UPDATE`,
        [slotId]
    );

    return rows[0] || null;
};

const findReplacementSlot = async (executor, { buildingId, excludeSlotId }) => {
    const [rows] = await executor.query(
        `SELECT s.id, s.floor_id AS floorId, s.slot_code AS slotCode
         FROM parking_slots s
         INNER JOIN parking_floors f ON s.floor_id = f.id
         WHERE s.building_id = ?
            AND s.id <> ?
            AND s.status = 'AVAILABLE'
            AND f.floor_type = 'CAR'
            AND f.status = 'ACTIVE'
         ORDER BY s.id ASC
         LIMIT 1
         FOR UPDATE`,
        [buildingId, excludeSlotId]
    );

    return rows[0] || null;
};

const getWrongSlotPenalty = async (executor, staffId) => {
    await executor.query(
        `INSERT INTO violation_types
            (code, name, default_penalty_fee, status, description, created_by)
         VALUES ('WRONG_SLOT', 'Ô tô đậu sai ô', 50000, 'ACTIVE', 'Ô tô đậu sai ô được chỉ định', ?)
         ON DUPLICATE KEY UPDATE
            code = VALUES(code)`,
        [staffId || null]
    );

    const [rows] = await executor.query(
        `SELECT id, code, name, default_penalty_fee AS defaultPenaltyFee
         FROM violation_types
         WHERE code = 'WRONG_SLOT'
         LIMIT 1`,
        []
    );

    return rows[0] || {
        id: null,
        code: "WRONG_SLOT",
        name: "Ô tô đậu sai ô",
        defaultPenaltyFee: 50000,
    };
};

const moveSessionToObservedSlot = async ({
    connection,
    observedSlotId,
    originalSlotId,
    session,
}) => {
    if (originalSlotId && Number(originalSlotId) !== Number(observedSlotId)) {
        const originalStatus =
            session.pricing_type === "MONTHLY_PASS" ? "RESERVED" : "AVAILABLE";

        await connection.query(
            `UPDATE parking_slots
             SET status = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [originalStatus, originalSlotId]
        );
    }

    await connection.query(
        `UPDATE parking_slots
         SET status = 'OCCUPIED',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [observedSlotId]
    );

    await connection.query(
        `UPDATE parking_sessions
         SET slot_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [observedSlotId, session.id]
    );
};

const reportWrongSlot = async ({
    evidenceUrl,
    note,
    observedSlotId,
    parkingSessionId,
    staffId,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [sessionRows] = await connection.query(
            `SELECT *
             FROM parking_sessions
             WHERE id = ?
                AND status = 'ACTIVE'
                AND vehicle_type = 'CAR'
             LIMIT 1
             FOR UPDATE`,
            [parkingSessionId]
        );
        const session = sessionRows[0];

        if (!session) {
            const error = new Error("Khong tim thay phien oto dang gui");
            error.statusCode = 404;
            throw error;
        }

        const [slotRows] = await connection.query(
            `SELECT *
             FROM parking_slots
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [observedSlotId]
        );
        const observedSlot = slotRows[0];

        if (!observedSlot) {
            const error = new Error("Khong tim thay slot xe dang dau");
            error.statusCode = 404;
            throw error;
        }

        if (Number(observedSlot.building_id) !== Number(session.building_id)) {
            const error = new Error("Slot khong thuoc toa nha cua phien gui xe");
            error.statusCode = 400;
            throw error;
        }

        const reservedRegistration = await getReservedRegistrationBySlot(
            connection,
            observedSlotId
        );
        const isReservedForAnotherVehicle =
            reservedRegistration &&
            Number(reservedRegistration.vehicleId) !== Number(session.vehicle_id);
        const status = isReservedForAnotherVehicle ? "WAITING_USER" : "ALLOWED";

        const [caseResult] = await connection.query(
            `INSERT INTO wrong_slot_cases
                (
                    parking_session_id,
                    vehicle_id,
                    user_id,
                    building_id,
                    original_slot_id,
                    observed_slot_id,
                    reserved_registration_id,
                    evidence_url,
                    note,
                    status,
                    notify_until,
                    staff_id
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), ?)`,
            [
                session.id,
                session.vehicle_id || null,
                session.user_id || null,
                session.building_id,
                session.slot_id || null,
                observedSlotId,
                reservedRegistration?.id || null,
                evidenceUrl || null,
                note || null,
                status,
                staffId,
            ]
        );

        if (status === "ALLOWED") {
            await moveSessionToObservedSlot({
                connection,
                observedSlotId,
                originalSlotId: session.slot_id,
                session,
            });

            if (session.user_id) {
                await notificationService.createNotification({
                    connection,
                    evidenceUrl,
                    relatedId: caseResult.insertId,
                    relatedType: "WRONG_SLOT_CASE",
                    title: "Nhac nho dau dung o da duoc phan",
                    message:
                        "Xe cua ban dang dau o khac voi o da ghi nhan. O nay hien chua co ai dat nen khong phat sinh phi, vui long dau dung o trong nhung lan sau.",
                    userId: session.user_id,
                });
            }
        } else {
            await connection.query(
                `UPDATE parking_slots
                 SET status = 'LOCKED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [observedSlotId]
            );

            if (session.user_id) {
                await notificationService.createNotification({
                    connection,
                    evidenceUrl,
                    relatedId: caseResult.insertId,
                    relatedType: "WRONG_SLOT_CASE",
                    title: "Can doi xe khoi o dau da dat",
                    message:
                        "Xe cua ban dang dau vao o da co xe khac dat truoc. Vui long doi xe trong 15 phut de khong phat sinh phi vi pham.",
                    userId: session.user_id,
                });
            }

            await notificationService.createNotification({
                connection,
                evidenceUrl,
                relatedId: caseResult.insertId,
                relatedType: "WRONG_SLOT_CASE",
                title: "Ô đăng ký của bạn đang bị chiếm",
                message: `Ô ${observedSlot.slot_code} đang bị xe ${session.plate_number} đậu nhầm. Hệ thống đang đếm ngược 15 phút; nếu xe chưa dời, bạn sẽ được gán một ô tạm trong cùng tòa nhà.`,
                userId: reservedRegistration.userId,
            });
        }

        await connection.commit();

        return getCaseById(caseResult.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const confirmWrongSlot = async ({ id, staffId }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [caseRows] = await connection.query(
            `SELECT *
             FROM wrong_slot_cases
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );
        const wrongCase = caseRows[0];

        if (!wrongCase) {
            const error = new Error("Khong tim thay ca dau sai slot");
            error.statusCode = 404;
            throw error;
        }

        if (wrongCase.status !== "WAITING_USER") {
            const error = new Error("Ca nay khong con cho xu ly");
            error.statusCode = 400;
            throw error;
        }

        const deadline = wrongCase.notify_until
            ? new Date(wrongCase.notify_until).getTime()
            : 0;

        if (deadline > Date.now()) {
            const error = new Error("Chua qua 15 phut cho user phan hoi");
            error.statusCode = 400;
            throw error;
        }

        const [sessionRows] = await connection.query(
            `SELECT *
             FROM parking_sessions
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [wrongCase.parking_session_id]
        );
        const session = sessionRows[0];

        if (!session) {
            const error = new Error("Khong tim thay phien gui xe");
            error.statusCode = 404;
            throw error;
        }

        const penalty = await getWrongSlotPenalty(connection, staffId);
        const [violationResult] = await connection.query(
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
             VALUES (?, ?, ?, ?, 'CAR', ?, ?, ?, ?, ?, 'OPEN')`,
            [
                session.id,
                session.vehicle_id || null,
                penalty.id,
                session.plate_number,
                penalty.name,
                staffId,
                wrongCase.note || "Xe dau sai slot da qua thoi gian phan hoi",
                wrongCase.evidence_url || null,
                Number(penalty.defaultPenaltyFee || 50000),
            ]
        );

        if (session.user_id) {
            await notificationService.createNotification({
                connection,
                evidenceUrl: wrongCase.evidence_url || null,
                relatedId: wrongCase.id,
                relatedType: "WRONG_SLOT_CASE",
                title: "Da tinh phi vi pham dau sai o",
                message:
                    "Xe cua ban khong duoc doi sau 15 phut nen he thong da ghi nhan phi vi pham. Phi nay se duoc cong khi xe ra bai.",
                userId: session.user_id,
            });
        }

        const reservedRegistration = wrongCase.reserved_registration_id
            ? await getReservedRegistrationBySlot(
                  connection,
                  wrongCase.observed_slot_id
              )
            : null;
        let reassignedSlot = null;

        if (reservedRegistration) {
            reassignedSlot = await findReplacementSlot(connection, {
                buildingId: wrongCase.building_id,
                excludeSlotId: wrongCase.observed_slot_id,
            });

            if (reassignedSlot) {
                await connection.query(
                    `UPDATE slot_registrations
                     SET slot_id = ?,
                         floor_id = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [
                        reassignedSlot.id,
                        reassignedSlot.floorId,
                        reservedRegistration.id,
                    ]
                );

                await connection.query(
                    `UPDATE parking_slots
                     SET status = 'RESERVED',
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [reassignedSlot.id]
                );

                await notificationService.createNotification({
                    connection,
                    relatedId: wrongCase.id,
                    relatedType: "WRONG_SLOT_CASE",
                    title: "O dau xe cua ban da duoc doi",
                    message: `O da dat truoc cua ban tam thoi duoc chuyen sang ${reassignedSlot.slotCode} de dam bao cho dau xe.`,
                    userId: reservedRegistration.userId,
                });
            }
        }

        await moveSessionToObservedSlot({
            connection,
            observedSlotId: wrongCase.observed_slot_id,
            originalSlotId: wrongCase.original_slot_id,
            session,
        });

        await connection.query(
            `UPDATE wrong_slot_cases
             SET status = 'PENALIZED',
                 violation_id = ?,
                 reassigned_slot_id = ?,
                 restoration_status = ?,
                 staff_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                violationResult.insertId,
                reassignedSlot?.id || null,
                reassignedSlot ? "TEMP_ASSIGNED" : "NONE",
                staffId,
                wrongCase.id,
            ]
        );

        await connection.commit();

        return getCaseById(wrongCase.id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const processExpiredWrongSlotCases = async ({ buildingId } = {}) => {
    const conditions = [
        "status = 'WAITING_USER'",
        "notify_until IS NOT NULL",
        "notify_until <= CURRENT_TIMESTAMP",
    ];
    const params = [];

    if (buildingId) {
        conditions.push("building_id = ?");
        params.push(buildingId);
    }

    const [rows] = await db.query(
        `SELECT id, staff_id AS staffId
         FROM wrong_slot_cases
         WHERE ${conditions.join(" AND ")}
         ORDER BY notify_until ASC
         LIMIT 100`,
        params
    );
    const processed = [];

    for (const row of rows) {
        try {
            processed.push(await confirmWrongSlot({
                id: row.id,
                staffId: row.staffId,
            }));
        } catch (error) {
            if (!["Ca nay khong con cho xu ly", "Chua qua 15 phut cho user phan hoi"].includes(error.message)) {
                console.error("[wrong-slot:auto-confirm]", row.id, error.message);
            }
        }
    }

    return processed;
};

const markWrongSlotMoved = async ({ id, userId }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [caseRows] = await connection.query(
            `SELECT *
             FROM wrong_slot_cases
             WHERE id = ?
                AND user_id = ?
             LIMIT 1
             FOR UPDATE`,
            [id, userId]
        );
        const wrongCase = caseRows[0];

        if (!wrongCase) {
            const error = new Error("Không tìm thấy yêu cầu dời xe của bạn");
            error.statusCode = 404;
            throw error;
        }

        if (wrongCase.status !== "WAITING_USER") {
            const error = new Error("Yêu cầu này không còn chờ dời xe");
            error.statusCode = 400;
            throw error;
        }

        if (
            wrongCase.notify_until &&
            new Date(wrongCase.notify_until).getTime() <= Date.now()
        ) {
            const error = new Error("Đã hết thời gian dời xe, hệ thống đang xử lý quá hạn");
            error.statusCode = 400;
            throw error;
        }

        const [sessionRows] = await connection.query(
            `SELECT *
             FROM parking_sessions
             WHERE id = ? AND status = 'ACTIVE'
             LIMIT 1
             FOR UPDATE`,
            [wrongCase.parking_session_id]
        );
        const session = sessionRows[0];

        if (!session) {
            const error = new Error("Phiên gửi xe không còn hoạt động");
            error.statusCode = 400;
            throw error;
        }

        if (wrongCase.original_slot_id) {
            await connection.query(
                `UPDATE parking_slots
                 SET status = 'OCCUPIED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [wrongCase.original_slot_id]
            );
        }

        await connection.query(
            `UPDATE parking_slots
             SET status = 'RESERVED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [wrongCase.observed_slot_id]
        );

        await connection.query(
            `UPDATE wrong_slot_cases
             SET status = 'USER_MOVED',
                 restoration_status = 'RESTORED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [wrongCase.id]
        );

        await notificationService.createNotification({
            connection,
            relatedId: wrongCase.id,
            relatedType: "WRONG_SLOT_CASE",
            title: "Đã xác nhận xe được dời đúng hạn",
            message: "Bạn đã xác nhận dời xe trước thời hạn nên không phát sinh phí vi phạm đậu sai ô.",
            userId,
        });

        if (wrongCase.reserved_registration_id) {
            const [registrationRows] = await connection.query(
                `SELECT user_id AS userId
                 FROM slot_registrations
                 WHERE id = ?
                 LIMIT 1`,
                [wrongCase.reserved_registration_id]
            );
            const reservedUserId = registrationRows[0]?.userId;

            if (reservedUserId) {
                await notificationService.createNotification({
                    connection,
                    relatedId: wrongCase.id,
                    relatedType: "WRONG_SLOT_CASE",
                    title: "Ô đăng ký của bạn đã được trả lại",
                    message: "Xe đậu nhầm đã được dời trước thời hạn. Ô đăng ký của bạn tiếp tục được giữ như ban đầu.",
                    userId: reservedUserId,
                });
            }
        }

        await connection.commit();
        return getCaseById(wrongCase.id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const restoreReservedSlotAfterOccupierCheckout = async ({ connection, session }) => {
    if (!session?.id || session.vehicleType !== "CAR") {
        return [];
    }

    const executor = connection || db;
    const [caseRows] = await executor.query(
        `SELECT
            c.id,
            c.observed_slot_id AS observedSlotId,
            c.reassigned_slot_id AS reassignedSlotId,
            c.reserved_registration_id AS reservedRegistrationId,
            rr.user_id AS reservedUserId,
            rr.vehicle_id AS reservedVehicleId,
            rr.slot_id AS currentReservedSlotId,
            v.plate_number AS reservedPlateNumber,
            obs.slot_code AS observedSlotCode,
            obs.floor_id AS observedFloorId,
            rs.slot_code AS reassignedSlotCode
         FROM wrong_slot_cases c
         INNER JOIN slot_registrations rr ON c.reserved_registration_id = rr.id
         INNER JOIN vehicles v ON rr.vehicle_id = v.id
         INNER JOIN parking_slots obs ON c.observed_slot_id = obs.id
         LEFT JOIN parking_slots rs ON c.reassigned_slot_id = rs.id
         WHERE c.parking_session_id = ?
            AND c.status = 'PENALIZED'
            AND c.restoration_status IN ('TEMP_ASSIGNED', 'WAITING_RESERVED_EXIT')
            AND c.reserved_registration_id IS NOT NULL
            AND c.reassigned_slot_id IS NOT NULL`,
        [session.id]
    );

    const restored = [];

    for (const wrongCase of caseRows) {
        const [activeRows] = await executor.query(
            `SELECT id
             FROM parking_sessions
             WHERE vehicle_id = ?
                AND status IN ('ACTIVE', 'PENDING_PAYMENT')
             LIMIT 1`,
            [wrongCase.reservedVehicleId]
        );
        const reservedVehicleInside = Boolean(activeRows[0]);

        if (!reservedVehicleInside) {
            await executor.query(
                `UPDATE slot_registrations
                 SET slot_id = ?,
                     floor_id = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [
                    wrongCase.observedSlotId,
                    wrongCase.observedFloorId,
                    wrongCase.reservedRegistrationId,
                ]
            );

            await executor.query(
                `UPDATE parking_slots
                 SET status = 'RESERVED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [wrongCase.observedSlotId]
            );

            await executor.query(
                `UPDATE parking_slots
                 SET status = 'AVAILABLE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                    AND status = 'RESERVED'`,
                [wrongCase.reassignedSlotId]
            );

            await notificationService.createNotification({
                connection: executor,
                relatedId: wrongCase.id,
                relatedType: "WRONG_SLOT_CASE",
                title: "O dang ky cua ban da duoc tra lai",
                message: `Xe chiem o da roi bai. O dang ky cua ban da duoc chuyen lai ve ${wrongCase.observedSlotCode}.`,
                userId: wrongCase.reservedUserId,
            });

            await executor.query(
                `UPDATE wrong_slot_cases
                 SET restoration_status = 'RESTORED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [wrongCase.id]
            );
        } else {
            await executor.query(
                `UPDATE parking_slots
                 SET status = 'LOCKED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [wrongCase.observedSlotId]
            );

            await executor.query(
                `UPDATE wrong_slot_cases
                 SET restoration_status = 'WAITING_RESERVED_EXIT',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [wrongCase.id]
            );

            await notificationService.createNotification({
                connection: executor,
                relatedId: wrongCase.id,
                relatedType: "WRONG_SLOT_CASE",
                title: "O dang ky cua ban da trong tro lai",
                message: `Xe chiem o ${wrongCase.observedSlotCode} da roi bai. Neu xe cua ban dang o ${wrongCase.reassignedSlotCode}, ban co the yeu cau nhan vien ho tro doi lai o dang ky.`,
                userId: wrongCase.reservedUserId,
            });
        }

        restored.push({
            caseId: wrongCase.id,
            observedSlotCode: wrongCase.observedSlotCode,
            reassignedSlotCode: wrongCase.reassignedSlotCode,
            reservedVehicleInside,
        });
    }

    return restored;
};

const restoreOriginalSlotAfterReservedVehicleCheckout = async ({
    connection,
    session,
}) => {
    if (!session?.vehicleId || session.vehicleType !== "CAR") {
        return [];
    }

    const executor = connection || db;
    const [caseRows] = await executor.query(
        `SELECT
            c.id,
            c.observed_slot_id AS originalReservedSlotId,
            c.reassigned_slot_id AS temporarySlotId,
            c.reserved_registration_id AS reservedRegistrationId,
            rr.user_id AS reservedUserId,
            originalSlot.floor_id AS originalFloorId,
            originalSlot.slot_code AS originalSlotCode,
            temporarySlot.slot_code AS temporarySlotCode
         FROM wrong_slot_cases c
         INNER JOIN slot_registrations rr ON c.reserved_registration_id = rr.id
         INNER JOIN parking_slots originalSlot ON c.observed_slot_id = originalSlot.id
         LEFT JOIN parking_slots temporarySlot ON c.reassigned_slot_id = temporarySlot.id
         WHERE rr.vehicle_id = ?
            AND c.status = 'PENALIZED'
            AND c.restoration_status = 'WAITING_RESERVED_EXIT'
         FOR UPDATE`,
        [session.vehicleId]
    );
    const restored = [];

    for (const wrongCase of caseRows) {
        await executor.query(
            `UPDATE slot_registrations
             SET slot_id = ?,
                 floor_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                wrongCase.originalReservedSlotId,
                wrongCase.originalFloorId,
                wrongCase.reservedRegistrationId,
            ]
        );

        await executor.query(
            `UPDATE parking_slots
             SET status = 'RESERVED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [wrongCase.originalReservedSlotId]
        );

        if (
            wrongCase.temporarySlotId &&
            Number(wrongCase.temporarySlotId) !== Number(wrongCase.originalReservedSlotId)
        ) {
            await executor.query(
                `UPDATE parking_slots
                 SET status = 'AVAILABLE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                    AND status IN ('RESERVED', 'LOCKED')`,
                [wrongCase.temporarySlotId]
            );
        }

        await executor.query(
            `UPDATE wrong_slot_cases
             SET restoration_status = 'RESTORED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [wrongCase.id]
        );

        await notificationService.createNotification({
            connection: executor,
            relatedId: wrongCase.id,
            relatedType: "WRONG_SLOT_CASE",
            title: "Ô đăng ký ban đầu đã được khôi phục",
            message: `Sau khi xe của bạn rời ô tạm ${wrongCase.temporarySlotCode || ""}, ô đăng ký ${wrongCase.originalSlotCode} đã được giữ lại cho bạn.`,
            userId: wrongCase.reservedUserId,
        });

        restored.push({
            caseId: wrongCase.id,
            originalSlotCode: wrongCase.originalSlotCode,
            temporarySlotCode: wrongCase.temporarySlotCode,
        });
    }

    return restored;
};

module.exports = {
    confirmWrongSlot,
    getCaseById,
    getCases,
    markWrongSlotMoved,
    processExpiredWrongSlotCases,
    reportWrongSlot,
    restoreOriginalSlotAfterReservedVehicleCheckout,
    restoreReservedSlotAfterOccupierCheckout,
};
