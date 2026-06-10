const db = require("../config/db");

const registrationSelect = `
    SELECT
        r.id,
        r.user_id AS userId,
        r.vehicle_id AS vehicleId,
        v.plate_number AS plateNumber,
        v.vehicle_type AS vehicleType,
        r.building_id AS buildingId,
        b.name AS buildingName,
        r.floor_id AS floorId,
        f.name AS floorName,
        r.slot_id AS slotId,
        s.slot_code AS slotCode,
        r.registration_type AS registrationType,
        r.amount,
        r.status,
        r.start_date AS startDate,
        r.end_date AS endDate,
        r.note,
        r.created_at AS createdAt,
        r.updated_at AS updatedAt,
        p.id AS paymentId,
        p.provider AS paymentProvider,
        p.status AS paymentStatus,
        p.transaction_ref AS transactionRef,
        p.provider_transaction_no AS providerTransactionNo,
        p.response_code AS paymentResponseCode,
        p.transaction_status AS paymentTransactionStatus
    FROM slot_registrations r
    INNER JOIN vehicles v ON r.vehicle_id = v.id
    INNER JOIN buildings b ON r.building_id = b.id
    INNER JOIN parking_floors f ON r.floor_id = f.id
    INNER JOIN parking_slots s ON r.slot_id = s.id
    LEFT JOIN payments p ON p.slot_registration_id = r.id
`;

const getVehicleForRegistration = async ({ userId, vehicleId }) => {
    const [rows] = await db.query(
        `SELECT
            id,
            user_id AS userId,
            building_id AS buildingId,
            plate_number AS plateNumber,
            vehicle_type AS vehicleType,
            status
         FROM vehicles
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [vehicleId, userId]
    );

    return rows[0] || null;
};

const getSlotForRegistration = async (slotId) => {
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

const findActiveRegistrationByVehicleId = async (vehicleId) => {
    const [rows] = await db.query(
        `SELECT id
         FROM slot_registrations
         WHERE vehicle_id = ?
            AND status IN ('PENDING_PAYMENT', 'PAID')
         LIMIT 1`,
        [vehicleId]
    );

    return rows[0] || null;
};

const findActiveRegistrationBySlotId = async (slotId) => {
    const [rows] = await db.query(
        `SELECT id
         FROM slot_registrations
         WHERE slot_id = ?
            AND status IN ('PENDING_PAYMENT', 'PAID')
         LIMIT 1`,
        [slotId]
    );

    return rows[0] || null;
};

const getRegistrationById = async (id) => {
    const [rows] = await db.query(
        `${registrationSelect}
         WHERE r.id = ?
         ORDER BY p.id DESC
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getRegistrationByIdAndUserId = async ({ id, userId }) => {
    const [rows] = await db.query(
        `${registrationSelect}
         WHERE r.id = ? AND r.user_id = ?
         ORDER BY p.id DESC
         LIMIT 1`,
        [id, userId]
    );

    return rows[0] || null;
};

const getRegistrationsByUserId = async (userId) => {
    const [rows] = await db.query(
        `${registrationSelect}
         WHERE r.user_id = ?
         ORDER BY r.id DESC`,
        [userId]
    );

    return rows;
};

const createSlotRegistrationWithPayment = async ({
    amount,
    buildingId,
    endDate,
    floorId,
    note,
    paymentUrl,
    slotId,
    startDate,
    transactionRef,
    userId,
    vehicleId,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [registrationResult] = await connection.query(
            `INSERT INTO slot_registrations
                (user_id, vehicle_id, building_id, floor_id, slot_id, amount, start_date, end_date, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                vehicleId,
                buildingId,
                floorId,
                slotId,
                amount,
                startDate || null,
                endDate || null,
                note || null,
            ]
        );

        const registrationId = registrationResult.insertId;

        const [slotUpdateResult] = await connection.query(
            `UPDATE parking_slots
             SET status = 'RESERVED', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'AVAILABLE'`,
            [slotId]
        );

        if (slotUpdateResult.affectedRows === 0) {
            const error = new Error("Slot is no longer available");
            error.code = "SLOT_NOT_AVAILABLE";
            throw error;
        }

        const [paymentResult] = await connection.query(
            `INSERT INTO payments
                (slot_registration_id, amount, transaction_ref, payment_url)
             VALUES (?, ?, ?, ?)`,
            [registrationId, amount, transactionRef, paymentUrl]
        );

        await connection.commit();

        return {
            registrationId,
            paymentId: paymentResult.insertId,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updatePaymentUrl = async ({ paymentId, paymentUrl }) => {
    await db.query(
        `UPDATE payments
         SET payment_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [paymentUrl, paymentId]
    );
};

const getPaymentByTransactionRef = async (transactionRef) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.slot_registration_id AS slotRegistrationId,
            p.parking_session_id AS parkingSessionId,
            p.amount,
            p.status,
            p.transaction_ref AS transactionRef,
            r.slot_id AS registrationSlotId,
            r.status AS registrationStatus,
            ps.floor_id AS sessionFloorId,
            ps.slot_id AS sessionSlotId,
            ps.vehicle_type AS sessionVehicleType,
            ps.pricing_type AS sessionPricingType,
            ps.status AS sessionStatus
         FROM payments p
         LEFT JOIN slot_registrations r ON p.slot_registration_id = r.id
         LEFT JOIN parking_sessions ps ON p.parking_session_id = ps.id
         WHERE p.transaction_ref = ?
         LIMIT 1`,
        [transactionRef]
    );

    return rows[0] || null;
};

const markPaymentResult = async ({
    bankCode,
    payDate,
    providerTransactionNo,
    registrationId,
    parkingSessionId,
    responseCode,
    secureHash,
    slotId,
    sessionStatus,
    status,
    transactionRef,
    transactionStatus,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE payments
             SET
                status = ?,
                provider_transaction_no = ?,
                bank_code = ?,
                pay_date = ?,
                response_code = ?,
                transaction_status = ?,
                secure_hash = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE transaction_ref = ?`,
            [
                status,
                providerTransactionNo || null,
                bankCode || null,
                payDate || null,
                responseCode || null,
                transactionStatus || null,
                secureHash || null,
                transactionRef,
            ]
        );

        if (registrationId) {
            if (status === "SUCCESS") {
                await connection.query(
                    `UPDATE slot_registrations
                     SET status = 'PAID', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [registrationId]
                );

                await connection.query(
                    `UPDATE parking_slots
                     SET status = 'RESERVED', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [slotId]
                );
            } else {
                await connection.query(
                    `UPDATE slot_registrations
                     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND status = 'PENDING_PAYMENT'`,
                    [registrationId]
                );

                await connection.query(
                    `UPDATE parking_slots
                     SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [slotId]
                );
            }
        }

        if (parkingSessionId) {
            if (status === "SUCCESS") {
                await connection.query(
                    `UPDATE parking_sessions
                     SET
                        status = 'COMPLETED',
                        payment_status = 'PAID',
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [parkingSessionId]
                );

                if (sessionStatus?.vehicleType === "MOTORBIKE") {
                    await connection.query(
                        `UPDATE parking_floors
                         SET current_count = GREATEST(current_count - 1, 0),
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [sessionStatus.floorId]
                    );
                }

                if (sessionStatus?.vehicleType === "CAR" && sessionStatus.slotId) {
                    const nextSlotStatus =
                        sessionStatus.pricingType === "MONTHLY_PASS"
                            ? "RESERVED"
                            : "AVAILABLE";

                    await connection.query(
                        `UPDATE parking_slots
                         SET status = ?,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [nextSlotStatus, sessionStatus.slotId]
                    );
                }
            } else {
                await connection.query(
                    `UPDATE parking_sessions
                     SET
                        status = 'ACTIVE',
                        check_out_at = NULL,
                        payment_status = 'UNPAID',
                        payment_method = NULL,
                        updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [parkingSessionId]
                );
            }
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createSlotRegistrationWithPayment,
    findActiveRegistrationBySlotId,
    findActiveRegistrationByVehicleId,
    getPaymentByTransactionRef,
    getRegistrationById,
    getRegistrationByIdAndUserId,
    getRegistrationsByUserId,
    getSlotForRegistration,
    getVehicleForRegistration,
    markPaymentResult,
    updatePaymentUrl,
};
