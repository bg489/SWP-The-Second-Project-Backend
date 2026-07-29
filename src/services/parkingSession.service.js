const db = require("../config/db");
const tempQrCardService = require("./tempQrCard.service");
const violationService = require("./violation.service");
const wrongSlotCaseService = require("./wrongSlotCase.service");
const floorMismatchCaseService = require("./floorMismatchCase.service");
const hourlySlotReservationService = require("./hourlySlotReservation.service");

const sessionSelect = `
    SELECT
        ps.id,
        ps.user_id AS userId,
        ps.vehicle_id AS vehicleId,
        ps.building_id AS buildingId,
        b.name AS buildingName,
        ps.floor_id AS floorId,
        f.name AS floorName,
        ps.slot_id AS slotId,
        s.slot_code AS slotCode,
        ps.monthly_pass_id AS monthlyPassId,
        hourlyReservation.id AS hourlyReservationId,
        hourlyReservation.reservation_code AS hourlyReservationCode,
        hourlyReservation.start_at AS hourlyReservationStartAt,
        hourlyReservation.end_at AS hourlyReservationEndAt,
        hourlyReservation.amount AS hourlyReservationAmount,
        hourlyReservation.payment_method AS hourlyReservationPaymentMethod,
        ps.temp_qr_card_id AS tempQrCardId,
        tq.card_code AS tempQrCardCode,
        ps.session_qr_code AS sessionQrCode,
        ps.plate_number AS plateNumber,
        ps.vehicle_type AS vehicleType,
        ps.customer_type AS customerType,
        ps.pricing_type AS pricingType,
        ps.status,
        ps.check_in_at AS checkInAt,
        ps.check_out_at AS checkOutAt,
        ps.base_fee AS baseFee,
        ps.violation_fee AS violationFee,
        ps.total_amount AS totalAmount,
        ps.payment_status AS paymentStatus,
        ps.payment_method AS paymentMethod,
        ps.violation_note AS violationNote,
        ps.paid_note AS paidNote,
        ps.check_in_staff_id AS checkInStaffId,
        ps.check_out_staff_id AS checkOutStaffId,
        ps.note,
        ps.created_at AS createdAt,
        ps.updated_at AS updatedAt
    FROM parking_sessions ps
    INNER JOIN buildings b ON ps.building_id = b.id
    INNER JOIN parking_floors f ON ps.floor_id = f.id
    LEFT JOIN parking_slots s ON ps.slot_id = s.id
    LEFT JOIN temporary_qr_cards tq ON ps.temp_qr_card_id = tq.id
    LEFT JOIN hourly_slot_reservations hourlyReservation
        ON hourlyReservation.parking_session_id = ps.id
`;

const getVehicleByPlateNumber = async (plateNumber) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.user_id AS userId,
            v.building_id AS buildingId,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status,
            u.name AS ownerName,
            u.email AS ownerEmail
         FROM vehicles v
         INNER JOIN users u ON v.user_id = u.id
         WHERE v.plate_number = ?
         LIMIT 1`,
        [plateNumber]
    );

    return rows[0] || null;
};

const getActiveMonthlyPassByVehicleId = async (vehicleId) => {
    const [monthlyPassRows] = await db.query(
        `SELECT
            id,
            vehicle_id AS vehicleId,
            building_id AS buildingId,
            NULL AS slotId,
            'MONTHLY_PASS' AS source,
            start_date AS startDate,
            end_date AS endDate
         FROM monthly_passes
         WHERE vehicle_id = ?
            AND status = 'ACTIVE'
            AND CURRENT_DATE BETWEEN start_date AND end_date
         ORDER BY end_date DESC
         LIMIT 1`,
        [vehicleId]
    );

    if (monthlyPassRows[0]) {
        return monthlyPassRows[0];
    }

    const [slotRegistrationRows] = await db.query(
        `SELECT
            NULL AS id,
            vehicle_id AS vehicleId,
            building_id AS buildingId,
            slot_id AS slotId,
            'SLOT_REGISTRATION' AS source,
            start_date AS startDate,
            end_date AS endDate
         FROM slot_registrations
         WHERE vehicle_id = ?
            AND status = 'PAID'
            AND CURRENT_DATE BETWEEN start_date AND end_date
         ORDER BY end_date DESC
         LIMIT 1`,
        [vehicleId]
    );

    return slotRegistrationRows[0] || null;
};

const getActiveSessionByPlateNumber = async (plateNumber) => {
    const [rows] = await db.query(
        `${sessionSelect}
         WHERE ps.plate_number = ?
            AND ps.status IN ('ACTIVE', 'PENDING_PAYMENT')
         ORDER BY ps.id DESC
         LIMIT 1`,
        [plateNumber]
    );

    return rows[0] || null;
};

const getMotorbikeFloorForCheckIn = async ({ buildingId, floorId }) => {
    const params = [buildingId];
    let floorFilter = "";

    if (floorId) {
        floorFilter = "AND id = ?";
        params.push(floorId);
    }

    const [rows] = await db.query(
        `SELECT
            id,
            building_id AS buildingId,
            name,
            floor_type AS floorType,
            capacity,
            current_count AS currentCount,
            status
         FROM parking_floors
         WHERE building_id = ?
            AND floor_type = 'MOTORBIKE'
            AND status = 'ACTIVE'
            ${floorFilter}
         ORDER BY id ASC
         LIMIT 1`,
        params
    );

    return rows[0] || null;
};

const getCarSlotForCheckIn = async (slotId) => {
    const [rows] = await db.query(
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
         LIMIT 1`,
        [slotId]
    );

    return rows[0] || null;
};

const createSession = async ({
    buildingId,
    allowReservedSlot,
    customerType,
    floorId,
    hourlyReservation,
    monthlyPass,
    note,
    plateNumber,
    pricingType,
    sessionQrCode,
    slotId,
    staffId,
    tempQrCardId,
    userId,
    vehicleId,
    vehicleType,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if (vehicleType === "MOTORBIKE") {
            const [updateResult] = await connection.query(
                `UPDATE parking_floors
                 SET current_count = current_count + 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                    AND floor_type = 'MOTORBIKE'
                    AND status = 'ACTIVE'
                    AND current_count < capacity`,
                [floorId]
            );

            if (updateResult.affectedRows === 0) {
                const error = new Error("Motorbike floor is full or inactive");
                error.code = "MOTORBIKE_FLOOR_FULL";
                throw error;
            }
        }

        if (vehicleType === "CAR") {
            const allowedStatuses = allowReservedSlot
                ? ["AVAILABLE", "RESERVED"]
                : ["AVAILABLE"];
            const placeholders = allowedStatuses.map(() => "?").join(", ");
            const [updateResult] = await connection.query(
                `UPDATE parking_slots
                 SET status = 'OCCUPIED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                    AND status IN (${placeholders})`,
                [slotId, ...allowedStatuses]
            );

            if (updateResult.affectedRows === 0) {
                const error = new Error("Car slot is not available");
                error.code = "CAR_SLOT_NOT_AVAILABLE";
                throw error;
            }
        }

        const [result] = await connection.query(
            `INSERT INTO parking_sessions
                (
                    user_id,
                    vehicle_id,
                    building_id,
                    floor_id,
                    slot_id,
                    monthly_pass_id,
                    temp_qr_card_id,
                    session_qr_code,
                    plate_number,
                    vehicle_type,
                    customer_type,
                    pricing_type,
                    check_in_staff_id,
                    note
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                vehicleId || null,
                buildingId,
                floorId,
                slotId || null,
                monthlyPass?.id || null,
                tempQrCardId || null,
                sessionQrCode || null,
                plateNumber,
                vehicleType,
                customerType,
                pricingType,
                staffId,
                note || null,
            ]
        );

        if (tempQrCardId) {
            await tempQrCardService.markCardInUse({
                cardId: tempQrCardId,
                connection,
                sessionId: result.insertId,
            });
        }

        if (hourlyReservation?.id) {
            await hourlySlotReservationService.markReservationCheckedIn({
                connection,
                reservationId: hourlyReservation.id,
                sessionId: result.insertId,
            });
        }

        await connection.commit();

        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getSessionById = async (id) => {
    const [rows] = await db.query(
        `${sessionSelect}
         WHERE ps.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getActiveSessions = async ({ buildingId } = {}) => {
    const conditions = ["ps.status IN ('ACTIVE', 'PENDING_PAYMENT')"];
    const params = [];

    if (buildingId) {
        conditions.push("ps.building_id = ?");
        params.push(buildingId);
    }

    const [rows] = await db.query(
        `${sessionSelect}
         WHERE ${conditions.join(" AND ")}
         ORDER BY ps.id DESC`,
        params
    );

    return rows;
};

const getActiveSessionsByUserId = async (userId) => {
    const [rows] = await db.query(
        `${sessionSelect}
         WHERE ps.user_id = ?
            AND ps.status IN ('ACTIVE', 'PENDING_PAYMENT')
         ORDER BY ps.id DESC`,
        [userId]
    );

    return rows;
};

const createDailySummary = () => ({
    currentlyParked: { total: 0, motorbike: 0, car: 0 },
    enteredToday: { total: 0, motorbike: 0, car: 0 },
    exitedToday: { total: 0, motorbike: 0, car: 0 },
});

const addDailySummaryValues = (summary, vehicleType, values) => {
    if (!["MOTORBIKE", "CAR"].includes(vehicleType)) {
        return;
    }

    const key = vehicleType === "CAR" ? "car" : "motorbike";

    Object.entries(values).forEach(([metric, rawValue]) => {
        const value = Number(rawValue || 0);
        summary[metric][key] += value;
        summary[metric].total += value;
    });
};

const getDailyActivity = async ({
    activity = "ALL",
    buildingId,
    date,
    search,
    vehicleType,
} = {}) => {
    const startAt = `${date} 00:00:00`;
    const endAt = `${date} 23:59:59`;
    const summaryConditions = [];
    const summaryParams = [startAt, endAt, startAt, endAt];

    if (buildingId) {
        summaryConditions.push("b.id = ?");
        summaryParams.push(buildingId);
    }

    const [summaryRows] = await db.query(
        `SELECT
            b.id AS buildingId,
            b.name AS buildingName,
            b.address AS buildingAddress,
            ps.vehicle_type AS vehicleType,
            SUM(CASE WHEN ps.status IN ('ACTIVE', 'PENDING_PAYMENT') THEN 1 ELSE 0 END) AS currentlyParked,
            SUM(CASE WHEN ps.check_in_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS enteredToday,
            SUM(CASE
                WHEN ps.status = 'COMPLETED' AND ps.check_out_at BETWEEN ? AND ? THEN 1
                ELSE 0
            END) AS exitedToday
         FROM buildings b
         LEFT JOIN parking_sessions ps ON ps.building_id = b.id
         ${summaryConditions.length ? `WHERE ${summaryConditions.join(" AND ")}` : ""}
         GROUP BY b.id, b.name, b.address, ps.vehicle_type
         ORDER BY b.name ASC, b.id ASC`,
        summaryParams
    );

    const summary = createDailySummary();
    const summariesByBuilding = new Map();

    summaryRows.forEach((row) => {
        const buildingKey = String(row.buildingId);

        if (!summariesByBuilding.has(buildingKey)) {
            summariesByBuilding.set(buildingKey, {
                buildingId: Number(row.buildingId),
                buildingName: row.buildingName,
                buildingAddress: row.buildingAddress,
                ...createDailySummary(),
            });
        }

        const values = {
            currentlyParked: row.currentlyParked,
            enteredToday: row.enteredToday,
            exitedToday: row.exitedToday,
        };

        addDailySummaryValues(summary, row.vehicleType, values);
        addDailySummaryValues(
            summariesByBuilding.get(buildingKey),
            row.vehicleType,
            values
        );
    });

    const conditions = [];
    const params = [startAt, endAt, startAt, endAt];

    if (buildingId) {
        conditions.push("ps.building_id = ?");
        params.push(buildingId);
    }

    if (vehicleType) {
        conditions.push("ps.vehicle_type = ?");
        params.push(vehicleType);
    }

    if (activity === "CURRENTLY_PARKED") {
        conditions.push("ps.status IN ('ACTIVE', 'PENDING_PAYMENT')");
    } else if (activity === "ENTERED") {
        conditions.push("ps.check_in_at BETWEEN ? AND ?");
        params.push(startAt, endAt);
    } else if (activity === "EXITED") {
        conditions.push("ps.status = 'COMPLETED' AND ps.check_out_at BETWEEN ? AND ?");
        params.push(startAt, endAt);
    } else {
        conditions.push(
            `(ps.status IN ('ACTIVE', 'PENDING_PAYMENT')
                OR ps.check_in_at BETWEEN ? AND ?
                OR (ps.status = 'COMPLETED' AND ps.check_out_at BETWEEN ? AND ?))`
        );
        params.push(startAt, endAt, startAt, endAt);
    }

    if (search) {
        const normalizedSearch = String(search)
            .toUpperCase()
            .replace(/[\s.-]/g, "");
        const textSearch = `%${search}%`;
        const plateSearch = `%${normalizedSearch}%`;

        conditions.push(
            `(REPLACE(REPLACE(REPLACE(UPPER(ps.plate_number), '-', ''), '.', ''), ' ', '') LIKE ?
                OR owner.name LIKE ?
                OR owner.email LIKE ?
                OR owner.phone LIKE ?
                OR b.name LIKE ?)`
        );
        params.push(plateSearch, textSearch, textSearch, textSearch, textSearch);
    }

    const [sessions] = await db.query(
        `SELECT
            ps.id,
            ps.user_id AS userId,
            ps.vehicle_id AS vehicleId,
            ps.building_id AS buildingId,
            b.name AS buildingName,
            b.address AS buildingAddress,
            ps.floor_id AS floorId,
            f.name AS floorName,
            ps.slot_id AS slotId,
            slot.slot_code AS slotCode,
            ps.monthly_pass_id AS monthlyPassId,
            ps.temp_qr_card_id AS tempQrCardId,
            tempQr.card_code AS tempQrCardCode,
            ps.session_qr_code AS sessionQrCode,
            ps.plate_number AS plateNumber,
            ps.vehicle_type AS vehicleType,
            ps.customer_type AS customerType,
            ps.pricing_type AS pricingType,
            ps.status,
            ps.check_in_at AS checkInAt,
            ps.check_out_at AS checkOutAt,
            ps.base_fee AS baseFee,
            ps.violation_fee AS violationFee,
            ps.total_amount AS totalAmount,
            ps.payment_status AS paymentStatus,
            ps.payment_method AS paymentMethod,
            owner.name AS ownerName,
            owner.email AS ownerEmail,
            owner.phone AS ownerPhone,
            owner.avatar_url AS ownerAvatarUrl,
            vehicle.brand AS vehicleBrand,
            vehicle.color AS vehicleColor,
            vehicle.plate_image_url AS plateImageUrl,
            checkInStaff.name AS checkInStaffName,
            checkOutStaff.name AS checkOutStaffName,
            CASE WHEN ps.check_in_at BETWEEN ? AND ? THEN 1 ELSE 0 END AS enteredOnDate,
            CASE
                WHEN ps.status = 'COMPLETED' AND ps.check_out_at BETWEEN ? AND ? THEN 1
                ELSE 0
            END AS exitedOnDate,
            CASE WHEN ps.status IN ('ACTIVE', 'PENDING_PAYMENT') THEN 1 ELSE 0 END AS currentlyParked
         FROM parking_sessions ps
         INNER JOIN buildings b ON ps.building_id = b.id
         INNER JOIN parking_floors f ON ps.floor_id = f.id
         LEFT JOIN parking_slots slot ON ps.slot_id = slot.id
         LEFT JOIN temporary_qr_cards tempQr ON ps.temp_qr_card_id = tempQr.id
         LEFT JOIN users owner ON ps.user_id = owner.id
         LEFT JOIN vehicles vehicle ON ps.vehicle_id = vehicle.id
         LEFT JOIN users checkInStaff ON ps.check_in_staff_id = checkInStaff.id
         LEFT JOIN users checkOutStaff ON ps.check_out_staff_id = checkOutStaff.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY COALESCE(ps.check_out_at, ps.check_in_at) DESC, ps.id DESC`,
        params
    );

    return {
        date,
        scope: {
            buildingId: buildingId ? Number(buildingId) : null,
        },
        summary,
        buildingSummaries: [...summariesByBuilding.values()],
        sessions: sessions.map((session) => ({
            ...session,
            currentlyParked: Boolean(session.currentlyParked),
            enteredOnDate: Boolean(session.enteredOnDate),
            exitedOnDate: Boolean(session.exitedOnDate),
        })),
    };
};

const normalizeQrLookupCode = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s.-]/g, "");

const getActiveSessionByQrCode = async (qrCode) => {
    const rawCode = String(qrCode || "").trim();

    const [rows] = await db.query(
        `${sessionSelect}
         WHERE ps.session_qr_code = ?
            AND ps.status IN ('ACTIVE', 'PENDING_PAYMENT')
         ORDER BY ps.id DESC
         LIMIT 1`,
        [rawCode]
    );

    if (rows[0]) {
        return rows[0];
    }

    const normalizedCode = normalizeQrLookupCode(rawCode);

    if (!normalizedCode) {
        return null;
    }

    const [plateRows] = await db.query(
        `${sessionSelect}
         WHERE (
            REPLACE(REPLACE(REPLACE(UPPER(ps.plate_number), '-', ''), '.', ''), ' ', '') = ?
            OR REPLACE(REPLACE(REPLACE(UPPER(ps.session_qr_code), '-', ''), '.', ''), ' ', '') = ?
         )
            AND ps.status IN ('ACTIVE', 'PENDING_PAYMENT')
         ORDER BY ps.id DESC
         LIMIT 1`,
        [normalizedCode, normalizedCode]
    );

    return plateRows[0] || null;
};

const releaseSessionParkingResource = async (connection, session) => {
    if (session.vehicleType === "MOTORBIKE") {
        await connection.query(
            `UPDATE parking_floors
             SET current_count = GREATEST(current_count - 1, 0),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [session.floorId]
        );
    }

    if (session.vehicleType === "CAR" && session.slotId) {
        if (session.hourlyReservationId) {
            await hourlySlotReservationService.completeReservationForSession({
                connection,
                session,
            });
        } else {
            const nextSlotStatus =
                session.pricingType === "MONTHLY_PASS" ? "RESERVED" : "AVAILABLE";

            await connection.query(
                `UPDATE parking_slots
                 SET status = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [nextSlotStatus, session.slotId]
            );
        }
    }

    if (session.tempQrCardId) {
        await tempQrCardService.completeCardSession({
            cardId: session.tempQrCardId,
            connection,
        });
    }
};

const completeSessionWithManualPayment = async ({
    baseFee,
    paymentMethod,
    paidNote,
    session,
    staffId,
    totalAmount,
    violationFee,
    violationNote,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const transactionRef = `MANUAL${Date.now()}S${session.id}`;
        const paymentStatus = totalAmount > 0 ? "SUCCESS" : "SUCCESS";
        const finalPaymentMethod =
            totalAmount > 0 ? paymentMethod : paymentMethod || "MONTHLY_PASS";

        const [paymentResult] = await connection.query(
            `INSERT INTO payments
                (parking_session_id, provider, amount, status, transaction_ref)
             VALUES (?, ?, ?, ?, ?)`,
            [session.id, finalPaymentMethod, totalAmount, paymentStatus, transactionRef]
        );

        await connection.query(
            `UPDATE parking_sessions
             SET
                status = 'COMPLETED',
                check_out_at = CURRENT_TIMESTAMP,
                base_fee = ?,
                violation_fee = ?,
                total_amount = ?,
                payment_status = ?,
                payment_method = ?,
                violation_note = ?,
                paid_note = ?,
                check_out_staff_id = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                baseFee,
                violationFee,
                totalAmount,
                totalAmount > 0 ? "PAID" : "WAIVED",
                finalPaymentMethod,
                violationNote || null,
                paidNote || null,
                staffId,
                session.id,
            ]
        );

        await releaseSessionParkingResource(connection, session);
        await violationService.markViolationsCollected({
            connection,
            paymentId: paymentResult.insertId,
            session,
        });
        await wrongSlotCaseService.restoreReservedSlotAfterOccupierCheckout({
            connection,
            session,
        });
        await wrongSlotCaseService.restoreOriginalSlotAfterReservedVehicleCheckout({
            connection,
            session,
        });
        await floorMismatchCaseService.restoreTemporarySlotAfterCheckout({
            connection,
            session,
        });
        await connection.commit();

        return transactionRef;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const createPendingVnpayPayment = async ({
    baseFee,
    paymentUrl,
    session,
    staffId,
    totalAmount,
    transactionRef,
    violationFee,
    violationNote,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO payments
                (parking_session_id, provider, amount, status, transaction_ref, payment_url)
             VALUES (?, 'VNPAY', ?, 'PENDING', ?, ?)`,
            [session.id, totalAmount, transactionRef, paymentUrl]
        );

        await connection.query(
            `UPDATE parking_sessions
             SET
                status = 'PENDING_PAYMENT',
                check_out_at = CURRENT_TIMESTAMP,
                base_fee = ?,
                violation_fee = ?,
                total_amount = ?,
                payment_status = 'PENDING',
                payment_method = 'VNPAY',
                violation_note = ?,
                check_out_staff_id = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                baseFee,
                violationFee,
                totalAmount,
                violationNote || null,
                staffId,
                session.id,
            ]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const completeSessionFromPayment = async ({ session }) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE parking_sessions
             SET
                status = 'COMPLETED',
                payment_status = 'PAID',
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [session.id]
        );

        await releaseSessionParkingResource(connection, session);
        await wrongSlotCaseService.restoreReservedSlotAfterOccupierCheckout({
            connection,
            session,
        });
        await wrongSlotCaseService.restoreOriginalSlotAfterReservedVehicleCheckout({
            connection,
            session,
        });
        await floorMismatchCaseService.restoreTemporarySlotAfterCheckout({
            connection,
            session,
        });
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const reopenSessionAfterFailedPayment = async ({ session }) => {
    await db.query(
        `UPDATE parking_sessions
         SET
            status = 'ACTIVE',
            check_out_at = NULL,
            payment_status = 'UNPAID',
            payment_method = NULL,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [session.id]
    );
};

module.exports = {
    completeSessionFromPayment,
    completeSessionWithManualPayment,
    createPendingVnpayPayment,
    createSession,
    getActiveMonthlyPassByVehicleId,
    getActiveSessionByPlateNumber,
    getActiveSessionByQrCode,
    getActiveSessions,
    getActiveSessionsByUserId,
    getDailyActivity,
    getCarSlotForCheckIn,
    getMotorbikeFloorForCheckIn,
    getSessionById,
    getVehicleByPlateNumber,
    reopenSessionAfterFailedPayment,
};
