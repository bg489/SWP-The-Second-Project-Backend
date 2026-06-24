const db = require("../config/db");

const monthlyPassSelect = `
    SELECT
        mp.id,
        mp.user_id AS userId,
        u.name AS ownerName,
        mp.vehicle_id AS vehicleId,
        v.plate_number AS plateNumber,
        mp.building_id AS buildingId,
        b.name AS buildingName,
        mp.slot_registration_id AS slotRegistrationId,
        mp.package_plan_id AS packagePlanId,
        pp.name AS packagePlanName,
        mp.vehicle_type AS vehicleType,
        mp.amount,
        mp.status,
        mp.start_date AS startDate,
        mp.end_date AS endDate,
        mp.note,
        p.id AS paymentId,
        p.provider AS paymentProvider,
        p.status AS paymentStatus,
        p.transaction_ref AS transactionRef,
        p.payment_url AS paymentUrl,
        p.provider_transaction_no AS providerTransactionNo,
        p.response_code AS paymentResponseCode,
        p.transaction_status AS paymentTransactionStatus,
        mp.created_at AS createdAt,
        mp.updated_at AS updatedAt
    FROM monthly_passes mp
    INNER JOIN vehicles v ON mp.vehicle_id = v.id
    LEFT JOIN users u ON mp.user_id = u.id
    LEFT JOIN buildings b ON mp.building_id = b.id
    LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
    LEFT JOIN payments p ON p.monthly_pass_id = mp.id
`;

const getVehicleForMonthlyPass = async (vehicleId) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.user_id AS userId,
            v.building_id AS buildingId,
            v.vehicle_type AS vehicleType,
            v.status
         FROM vehicles v
         WHERE v.id = ?
         LIMIT 1`,
        [vehicleId]
    );

    return rows[0] || null;
};

const createMonthlyPass = async ({
    amount,
    buildingId,
    endDate,
    note,
    packagePlanId,
    startDate,
    status,
    userId,
    vehicleId,
    vehicleType,
}) => {
    const [result] = await db.query(
        `INSERT INTO monthly_passes
            (
                user_id,
                vehicle_id,
                building_id,
                package_plan_id,
                vehicle_type,
                amount,
                status,
                start_date,
                end_date,
                note
            )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId || null,
            vehicleId,
            buildingId || null,
            packagePlanId || null,
            vehicleType,
            amount || 0,
            status || "ACTIVE",
            startDate,
            endDate,
            note || null,
        ]
    );

    return getMonthlyPassById(result.insertId);
};

const getMonthlyPasses = async () => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         ORDER BY mp.id DESC`
    );

    return rows;
};

const getMyMonthlyPasses = async (userId) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.user_id = ?
         ORDER BY mp.id DESC`,
        [userId]
    );

    return rows;
};

const getMonthlyPassById = async (id) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getMonthlyPassByIdAndUserId = async ({ id, userId }) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.id = ? AND mp.user_id = ?
         LIMIT 1`,
        [id, userId]
    );

    return rows[0] || null;
};

const updateMonthlyPassPaymentUrl = async ({
    paymentId,
    paymentUrl,
    transactionRef,
}) => {
    await db.query(
        `UPDATE payments
         SET payment_url = ?,
             transaction_ref = COALESCE(?, transaction_ref),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [paymentUrl, transactionRef || null, paymentId]
    );
};

module.exports = {
    createMonthlyPass,
    getMyMonthlyPasses,
    getMonthlyPassById,
    getMonthlyPassByIdAndUserId,
    getMonthlyPasses,
    getVehicleForMonthlyPass,
    updateMonthlyPassPaymentUrl,
};
