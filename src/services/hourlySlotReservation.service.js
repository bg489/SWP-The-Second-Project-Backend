const { randomUUID } = require("crypto");

const db = require("../config/db");
const notificationService = require("./notification.service");
const pricingPolicyService = require("./pricingPolicy.service");

const ACTIVE_RESERVATION_STATUSES = [
    "PENDING_PAYMENT",
    "BOOKED",
    "CHECKED_IN",
    "COMPLETED",
];

const reservationSelect = `
    SELECT
        r.id,
        r.reservation_code AS reservationCode,
        r.customer_type AS customerType,
        r.user_id AS userId,
        u.name AS userName,
        u.email AS userEmail,
        u.phone AS userPhone,
        r.vehicle_id AS vehicleId,
        v.brand AS vehicleBrand,
        v.color AS vehicleColor,
        r.guest_name AS guestName,
        r.guest_phone AS guestPhone,
        r.plate_number AS plateNumber,
        r.building_id AS buildingId,
        b.name AS buildingName,
        b.address AS buildingAddress,
        r.floor_id AS floorId,
        f.name AS floorName,
        r.slot_id AS slotId,
        s.slot_code AS slotCode,
        s.status AS slotStatus,
        r.start_at AS startAt,
        r.end_at AS endAt,
        r.hourly_rate AS hourlyRate,
        r.reserved_hours AS reservedHours,
        r.amount,
        r.payment_method AS paymentMethod,
        r.payment_status AS paymentStatus,
        r.status,
        r.payment_id AS paymentId,
        p.transaction_ref AS transactionRef,
        p.payment_url AS paymentUrl,
        p.status AS providerPaymentStatus,
        r.parking_session_id AS parkingSessionId,
        r.payment_expires_at AS paymentExpiresAt,
        r.paid_at AS paidAt,
        r.checked_in_at AS checkedInAt,
        r.completed_at AS completedAt,
        r.created_by AS createdBy,
        creator.name AS createdByName,
        creator.role AS createdByRole,
        r.note,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt
    FROM hourly_slot_reservations r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    INNER JOIN buildings b ON r.building_id = b.id
    INNER JOIN parking_floors f ON r.floor_id = f.id
    INNER JOIN parking_slots s ON r.slot_id = s.id
    LEFT JOIN payments p ON r.payment_id = p.id
    INNER JOIN users creator ON r.created_by = creator.id
`;

const normalizePlate = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

const normalizePlateLookup = (value) =>
    normalizePlate(value).replace(/[\s.-]/g, "");

const createReservationCode = () =>
    `BOOK-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const getReservationById = async (id, executor = db) => {
    const [rows] = await executor.query(
        `${reservationSelect}
         WHERE r.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const refreshSlotStatus = async (executor, slotId) => {
    const [slotRows] = await executor.query(
        `SELECT status
         FROM parking_slots
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [slotId]
    );
    const slot = slotRows[0];

    if (!slot || ["MAINTENANCE", "LOCKED", "CONFLICT"].includes(slot.status)) {
        return slot?.status || null;
    }

    const [sessionRows] = await executor.query(
        `SELECT id
         FROM parking_sessions
         WHERE slot_id = ?
            AND status IN ('ACTIVE', 'PENDING_PAYMENT')
         LIMIT 1`,
        [slotId]
    );

    if (sessionRows[0]) {
        await executor.query(
            `UPDATE parking_slots
             SET status = 'OCCUPIED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [slotId]
        );
        return "OCCUPIED";
    }

    const [monthlyRows] = await executor.query(
        `SELECT id
         FROM slot_registrations
         WHERE slot_id = ?
            AND status IN ('PENDING_PAYMENT', 'PAID')
         LIMIT 1`,
        [slotId]
    );

    if (monthlyRows[0]) {
        await executor.query(
            `UPDATE parking_slots
             SET status = 'RESERVED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [slotId]
        );
        return "RESERVED";
    }

    const [reservationRows] = await executor.query(
        `SELECT id, status
         FROM hourly_slot_reservations
         WHERE slot_id = ?
            AND status IN ('PENDING_PAYMENT', 'BOOKED', 'CHECKED_IN', 'COMPLETED')
            AND end_at > CURRENT_TIMESTAMP
            AND (
                status <> 'PENDING_PAYMENT'
                OR payment_expires_at > CURRENT_TIMESTAMP
            )
         ORDER BY FIELD(status, 'CHECKED_IN', 'BOOKED', 'PENDING_PAYMENT', 'COMPLETED')
         LIMIT 1`,
        [slotId]
    );
    const nextStatus = reservationRows[0]?.status === "CHECKED_IN"
        ? "OCCUPIED"
        : reservationRows[0]
          ? "RESERVED"
          : "AVAILABLE";

    await executor.query(
        `UPDATE parking_slots
         SET status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextStatus, slotId]
    );

    return nextStatus;
};

const processReservationLifecycle = async ({ buildingId } = {}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const buildingCondition = buildingId ? "AND building_id = ?" : "";
        const params = buildingId ? [buildingId] : [];
        const [expiredPaymentRows] = await connection.query(
            `SELECT id, payment_id AS paymentId, slot_id AS slotId
             FROM hourly_slot_reservations
             WHERE status = 'PENDING_PAYMENT'
                AND payment_expires_at IS NOT NULL
                AND payment_expires_at <= CURRENT_TIMESTAMP
                ${buildingCondition}
             FOR UPDATE`,
            params
        );
        const [expiredBookingRows] = await connection.query(
            `SELECT id, slot_id AS slotId
             FROM hourly_slot_reservations
             WHERE status = 'BOOKED'
                AND end_at <= CURRENT_TIMESTAMP
                ${buildingCondition}
             FOR UPDATE`,
            params
        );
        const [completedHoldRows] = await connection.query(
            `SELECT id, slot_id AS slotId
             FROM hourly_slot_reservations
             WHERE status = 'COMPLETED'
                AND end_at <= CURRENT_TIMESTAMP
                ${buildingCondition}
             FOR UPDATE`,
            params
        );

        if (expiredPaymentRows.length) {
            const reservationIds = expiredPaymentRows.map((row) => row.id);
            const paymentIds = expiredPaymentRows
                .map((row) => row.paymentId)
                .filter(Boolean);

            await connection.query(
                `UPDATE hourly_slot_reservations
                 SET status = 'CANCELLED',
                     payment_status = 'FAILED',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id IN (?)`,
                [reservationIds]
            );

            if (paymentIds.length) {
                await connection.query(
                    `UPDATE payments
                     SET status = 'FAILED',
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id IN (?) AND status = 'PENDING'`,
                    [paymentIds]
                );
            }
        }

        if (expiredBookingRows.length) {
            await connection.query(
                `UPDATE hourly_slot_reservations
                 SET status = 'EXPIRED',
                     completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id IN (?)`,
                [expiredBookingRows.map((row) => row.id)]
            );
        }

        const slotIds = [
            ...expiredPaymentRows,
            ...expiredBookingRows,
            ...completedHoldRows,
        ].map((row) => row.slotId);

        for (const slotId of [...new Set(slotIds)]) {
            await refreshSlotStatus(connection, slotId);
        }

        await connection.commit();

        return {
            cancelledPayments: expiredPaymentRows.length,
            expiredBookings: expiredBookingRows.length,
            releasedCompletedHolds: completedHoldRows.length,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getReservationQuote = async ({ buildingId, endAt, startAt }) => {
    const pricingPolicy = await pricingPolicyService.getActivePricingPolicy({
        buildingId,
        pricingType: "HOURLY",
        vehicleType: "CAR",
    });

    if (!pricingPolicy) {
        const error = new Error(
            "Tòa nhà chưa có mức giá ô tô theo giờ đang hoạt động"
        );
        error.statusCode = 400;
        throw error;
    }

    const durationMs = endAt.getTime() - startAt.getTime();
    const reservedHours = Math.max(
        1,
        Math.ceil(durationMs / (60 * 60 * 1000))
    );
    const hourlyRate = Number(pricingPolicy.amount);

    return {
        amount: reservedHours * hourlyRate,
        hourlyRate,
        pricingPolicyId: pricingPolicy.id,
        reservedHours,
    };
};

const getAvailableSlots = async ({ buildingId, endAt, startAt }) => {
    await processReservationLifecycle({ buildingId });

    const [rows] = await db.query(
        `SELECT
            s.id,
            s.building_id AS buildingId,
            s.floor_id AS floorId,
            f.name AS floorName,
            s.slot_code AS slotCode,
            s.status,
            EXISTS(
                SELECT 1
                FROM slot_registrations monthlyRegistration
                WHERE monthlyRegistration.slot_id = s.id
                    AND monthlyRegistration.status IN ('PENDING_PAYMENT', 'PAID')
            ) AS hasMonthlyRegistration,
            EXISTS(
                SELECT 1
                FROM hourly_slot_reservations booking
                WHERE booking.slot_id = s.id
                    AND booking.status IN ('PENDING_PAYMENT', 'BOOKED', 'CHECKED_IN', 'COMPLETED')
                    AND booking.start_at < ?
                    AND booking.end_at > ?
                    AND (
                        booking.status <> 'PENDING_PAYMENT'
                        OR booking.payment_expires_at > CURRENT_TIMESTAMP
                    )
            ) AS hasTimeConflict
         FROM parking_slots s
         INNER JOIN parking_floors f ON s.floor_id = f.id
         WHERE s.building_id = ?
            AND f.floor_type = 'CAR'
            AND f.status = 'ACTIVE'
         ORDER BY f.id ASC, s.slot_code ASC, s.id ASC`,
        [endAt, startAt, buildingId]
    );

    return rows.map((row) => {
        const canScheduleByStatus = ["AVAILABLE", "RESERVED"].includes(row.status);
        const isAvailable =
            canScheduleByStatus &&
            !Number(row.hasMonthlyRegistration) &&
            !Number(row.hasTimeConflict);

        return {
            ...row,
            hasMonthlyRegistration: Boolean(row.hasMonthlyRegistration),
            hasTimeConflict: Boolean(row.hasTimeConflict),
            isAvailable,
            unavailableReason: isAvailable
                ? null
                : Number(row.hasMonthlyRegistration)
                  ? "Ô đã đăng ký gói tháng"
                  : Number(row.hasTimeConflict)
                    ? "Ô đã có người đặt trong khung giờ này"
                    : row.status === "OCCUPIED"
                      ? "Ô đang có xe"
                      : "Ô đang tạm khóa hoặc bảo trì",
        };
    });
};

const ensureReservationSlotAvailable = async (
    connection,
    { endAt, slotId, startAt }
) => {
    const [slotRows] = await connection.query(
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
        [slotId]
    );
    const slot = slotRows[0];

    if (!slot) {
        const error = new Error("Không tìm thấy ô đỗ ô tô");
        error.statusCode = 404;
        throw error;
    }

    if (slot.floorType !== "CAR" || slot.floorStatus !== "ACTIVE") {
        const error = new Error("Ô đỗ không thuộc tầng ô tô đang hoạt động");
        error.statusCode = 400;
        throw error;
    }

    if (!["AVAILABLE", "RESERVED"].includes(slot.status)) {
        const error = new Error("Ô đỗ đang có xe, tạm khóa hoặc bảo trì");
        error.statusCode = 400;
        throw error;
    }

    const [monthlyRows] = await connection.query(
        `SELECT id
         FROM slot_registrations
         WHERE slot_id = ?
            AND status IN ('PENDING_PAYMENT', 'PAID')
         LIMIT 1`,
        [slotId]
    );

    if (monthlyRows[0]) {
        const error = new Error("Ô đỗ đã được đăng ký gói tháng");
        error.statusCode = 400;
        throw error;
    }

    const [conflictRows] = await connection.query(
        `SELECT id
         FROM hourly_slot_reservations
         WHERE slot_id = ?
            AND status IN ('PENDING_PAYMENT', 'BOOKED', 'CHECKED_IN', 'COMPLETED')
            AND start_at < ?
            AND end_at > ?
            AND (
                status <> 'PENDING_PAYMENT'
                OR payment_expires_at > CURRENT_TIMESTAMP
            )
         LIMIT 1
         FOR UPDATE`,
        [slotId, endAt, startAt]
    );

    if (conflictRows[0]) {
        const error = new Error("Ô đỗ đã có người đặt trong khung giờ này");
        error.statusCode = 400;
        throw error;
    }

    return slot;
};

const getRegisteredCarForReservation = async (
    connection,
    { userId, vehicleId }
) => {
    const [rows] = await connection.query(
        `SELECT
            id,
            user_id AS userId,
            building_id AS buildingId,
            plate_number AS plateNumber,
            vehicle_type AS vehicleType,
            status
         FROM vehicles
         WHERE id = ? AND user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [vehicleId, userId]
    );
    const vehicle = rows[0];

    if (!vehicle) {
        const error = new Error("Không tìm thấy xe thuộc tài khoản của bạn");
        error.statusCode = 404;
        throw error;
    }

    if (vehicle.vehicleType !== "CAR" || vehicle.status !== "APPROVED") {
        const error = new Error("Chỉ ô tô đã được duyệt mới có thể đặt ô");
        error.statusCode = 400;
        throw error;
    }

    return vehicle;
};

const createReservationWithPayment = async ({
    amount,
    buildingId,
    createdBy,
    customerType,
    endAt,
    guestName,
    guestPhone,
    hourlyRate,
    note,
    paymentMethod,
    paymentUrl,
    plateNumber,
    reservedHours,
    slotId,
    startAt,
    transactionRef,
    userId,
    vehicleId,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const slot = await ensureReservationSlotAvailable(connection, {
            endAt,
            slotId,
            startAt,
        });

        if (Number(slot.buildingId) !== Number(buildingId)) {
            const error = new Error("Ô đỗ không thuộc tòa nhà đã chọn");
            error.statusCode = 400;
            throw error;
        }

        let registeredVehicle = null;

        if (customerType === "REGISTERED_USER") {
            registeredVehicle = await getRegisteredCarForReservation(connection, {
                userId,
                vehicleId,
            });

            if (
                registeredVehicle.buildingId &&
                Number(registeredVehicle.buildingId) !== Number(buildingId)
            ) {
                const error = new Error("Xe không thuộc tòa nhà đang đặt ô");
                error.statusCode = 400;
                throw error;
            }
        }

        const finalPlateNumber = normalizePlate(
            registeredVehicle?.plateNumber || plateNumber
        );
        const normalizedPlateNumber = normalizePlateLookup(finalPlateNumber);
        const [vehicleConflictRows] = await connection.query(
            `SELECT id
             FROM hourly_slot_reservations
             WHERE REPLACE(REPLACE(REPLACE(UPPER(plate_number), '-', ''), '.', ''), ' ', '') = ?
                AND status IN ('PENDING_PAYMENT', 'BOOKED', 'CHECKED_IN', 'COMPLETED')
                AND start_at < ?
                AND end_at > ?
                AND (
                    status <> 'PENDING_PAYMENT'
                    OR payment_expires_at > CURRENT_TIMESTAMP
                )
             LIMIT 1
             FOR UPDATE`,
            [normalizedPlateNumber, endAt, startAt]
        );

        if (vehicleConflictRows[0]) {
            const error = new Error("Xe đã có một lượt đặt ô trong khung giờ này");
            error.statusCode = 400;
            throw error;
        }

        const paymentStatus = paymentMethod === "CASH" ? "SUCCESS" : "PENDING";
        const [paymentResult] = await connection.query(
            `INSERT INTO payments
                (provider, amount, status, transaction_ref, payment_url)
             VALUES (?, ?, ?, ?, ?)`,
            [
                paymentMethod,
                amount,
                paymentStatus,
                transactionRef,
                paymentUrl || null,
            ]
        );
        const reservationCode = createReservationCode();
        const isPaid = paymentMethod === "CASH";
        const [reservationResult] = await connection.query(
            `INSERT INTO hourly_slot_reservations
                (
                    reservation_code,
                    customer_type,
                    user_id,
                    vehicle_id,
                    guest_name,
                    guest_phone,
                    plate_number,
                    building_id,
                    floor_id,
                    slot_id,
                    start_at,
                    end_at,
                    hourly_rate,
                    reserved_hours,
                    amount,
                    payment_method,
                    payment_status,
                    status,
                    payment_id,
                    payment_expires_at,
                    paid_at,
                    created_by,
                    note
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ${isPaid ? "NULL" : "DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)"},
                ${isPaid ? "CURRENT_TIMESTAMP" : "NULL"}, ?, ?)`,
            [
                reservationCode,
                customerType,
                userId || null,
                registeredVehicle?.id || vehicleId || null,
                guestName || null,
                guestPhone || null,
                finalPlateNumber,
                buildingId,
                slot.floorId,
                slot.id,
                startAt,
                endAt,
                hourlyRate,
                reservedHours,
                amount,
                paymentMethod,
                isPaid ? "PAID" : "PENDING",
                isPaid ? "BOOKED" : "PENDING_PAYMENT",
                paymentResult.insertId,
                createdBy,
                note || null,
            ]
        );

        await connection.query(
            `UPDATE parking_slots
             SET status = 'RESERVED',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [slot.id]
        );

        if (isPaid && userId) {
            await notificationService.createNotification({
                connection,
                relatedId: reservationResult.insertId,
                relatedType: "HOURLY_SLOT_RESERVATION",
                title: "Đặt ô ô tô thành công",
                message: `Ô ${slot.slotCode} đã được đặt trước và thanh toán thành công.`,
                userId,
            });
        }

        await connection.commit();

        return {
            paymentId: paymentResult.insertId,
            reservationId: reservationResult.insertId,
            transactionRef,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getReservations = async ({ buildingId, status, userId } = {}) => {
    await processReservationLifecycle({ buildingId });

    const conditions = [];
    const params = [];

    if (buildingId) {
        conditions.push("r.building_id = ?");
        params.push(buildingId);
    }

    if (userId) {
        conditions.push("r.user_id = ?");
        params.push(userId);
    }

    if (status) {
        conditions.push("r.status = ?");
        params.push(status);
    }

    const whereSql = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
    const [rows] = await db.query(
        `${reservationSelect}
         ${whereSql}
         ORDER BY r.start_at DESC, r.id DESC`,
        params
    );

    return rows;
};

const getReservationForCheckIn = async ({
    buildingId,
    plateNumber,
    vehicleId,
}) => {
    await processReservationLifecycle({ buildingId });

    const conditions = [
        "r.building_id = ?",
        "r.status = 'BOOKED'",
        "r.payment_status = 'PAID'",
        "CURRENT_TIMESTAMP BETWEEN r.start_at AND r.end_at",
    ];
    const params = [buildingId];

    if (vehicleId) {
        conditions.push(
            `(r.vehicle_id = ?
                OR REPLACE(REPLACE(REPLACE(UPPER(r.plate_number), '-', ''), '.', ''), ' ', '') = ?)`
        );
        params.push(vehicleId, normalizePlateLookup(plateNumber));
    } else {
        conditions.push(
            "REPLACE(REPLACE(REPLACE(UPPER(r.plate_number), '-', ''), '.', ''), ' ', '') = ?"
        );
        params.push(normalizePlateLookup(plateNumber));
    }

    const [rows] = await db.query(
        `${reservationSelect}
         WHERE ${conditions.join(" AND ")}
         ORDER BY r.end_at ASC, r.id ASC
         LIMIT 1`,
        params
    );

    return rows[0] || null;
};

const markReservationCheckedIn = async ({
    connection,
    reservationId,
    sessionId,
}) => {
    const [result] = await connection.query(
        `UPDATE hourly_slot_reservations
         SET status = 'CHECKED_IN',
             parking_session_id = ?,
             checked_in_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
            AND status = 'BOOKED'
            AND payment_status = 'PAID'
            AND CURRENT_TIMESTAMP BETWEEN start_at AND end_at`,
        [sessionId, reservationId]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Lượt đặt ô không còn trong thời gian nhận xe");
        error.code = "RESERVATION_NOT_READY";
        throw error;
    }
};

const completeReservationForSession = async ({ connection, session }) => {
    if (!session?.hourlyReservationId) {
        return null;
    }

    await connection.query(
        `UPDATE hourly_slot_reservations
         SET status = 'COMPLETED',
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [session.hourlyReservationId]
    );

    return refreshSlotStatus(connection, session.slotId);
};

const applyPaymentResult = async ({
    connection,
    reservationId,
    status,
}) => {
    const [rows] = await connection.query(
        `SELECT *
         FROM hourly_slot_reservations
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [reservationId]
    );
    const reservation = rows[0];

    if (!reservation) {
        const error = new Error("Không tìm thấy lượt đặt ô theo giờ");
        error.statusCode = 404;
        throw error;
    }

    if (status === "SUCCESS") {
        await connection.query(
            `UPDATE hourly_slot_reservations
             SET status = 'BOOKED',
                 payment_status = 'PAID',
                 paid_at = CURRENT_TIMESTAMP,
                 payment_expires_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [reservationId]
        );

        await refreshSlotStatus(connection, reservation.slot_id);

        if (reservation.user_id) {
            const [slotRows] = await connection.query(
                `SELECT slot_code AS slotCode
                 FROM parking_slots
                 WHERE id = ?
                 LIMIT 1`,
                [reservation.slot_id]
            );

            await notificationService.createNotification({
                connection,
                relatedId: reservationId,
                relatedType: "HOURLY_SLOT_RESERVATION",
                title: "Đặt ô ô tô thành công",
                message: `Thanh toán thành công. Ô ${slotRows[0]?.slotCode || ""} đã được giữ theo khung giờ bạn chọn.`,
                userId: reservation.user_id,
            });
        }
    } else {
        await connection.query(
            `UPDATE hourly_slot_reservations
             SET status = 'CANCELLED',
                 payment_status = 'FAILED',
                 payment_expires_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [reservationId]
        );
        await refreshSlotStatus(connection, reservation.slot_id);
    }
};

module.exports = {
    ACTIVE_RESERVATION_STATUSES,
    applyPaymentResult,
    completeReservationForSession,
    createReservationWithPayment,
    getAvailableSlots,
    getReservationById,
    getReservationForCheckIn,
    getReservationQuote,
    getReservations,
    markReservationCheckedIn,
    normalizePlate,
    processReservationLifecycle,
    refreshSlotStatus,
};
