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
        mp.created_at AS createdAt,
        mp.updated_at AS updatedAt
    FROM monthly_passes mp
    INNER JOIN vehicles v ON mp.vehicle_id = v.id
    LEFT JOIN users u ON mp.user_id = u.id
    LEFT JOIN buildings b ON mp.building_id = b.id
    LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
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

const getMonthlyPassById = async (id) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

module.exports = {
    createMonthlyPass,
    getMonthlyPassById,
    getMonthlyPasses,
    getVehicleForMonthlyPass,
};
