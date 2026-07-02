const db = require("../config/db");

const packagePlanSelect = `
    SELECT
        id,
        building_id AS buildingId,
        (
            SELECT name
            FROM buildings
            WHERE buildings.id = package_plans.building_id
            LIMIT 1
        ) AS buildingName,
        name,
        vehicle_type AS vehicleType,
        price,
        duration_days AS durationDays,
        status,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM package_plans
`;

const createPackagePlan = async ({
    buildingId,
    description,
    durationDays,
    name,
    price,
    status,
    vehicleType,
}) => {
    const [result] = await db.query(
        `INSERT INTO package_plans
            (building_id, name, vehicle_type, price, duration_days, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            buildingId || null,
            name,
            vehicleType,
            price,
            durationDays,
            status || "ACTIVE",
            description || null,
        ]
    );

    return getPackagePlanById(result.insertId);
};

const getPackagePlans = async ({ buildingId, status, vehicleType } = {}) => {
    const conditions = [];
    const params = [];

    if (buildingId) {
        conditions.push("building_id = ?");
        params.push(buildingId);
    }

    if (vehicleType) {
        conditions.push("vehicle_type = ?");
        params.push(vehicleType);
    }

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${packagePlanSelect}
         ${whereSql}
         ORDER BY building_id ASC, vehicle_type ASC, price ASC, id DESC`,
        params
    );

    return rows;
};

const getPackagePlanById = async (id) => {
    const [rows] = await db.query(
        `${packagePlanSelect}
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const updatePackagePlan = async ({
    buildingId,
    description,
    durationDays,
    id,
    name,
    price,
    status,
    vehicleType,
}) => {
    await db.query(
        `UPDATE package_plans
         SET
            building_id = ?,
            name = ?,
            vehicle_type = ?,
            price = ?,
            duration_days = ?,
            status = ?,
            description = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
            buildingId || null,
            name,
            vehicleType,
            price,
            durationDays,
            status,
            description || null,
            id,
        ]
    );

    return getPackagePlanById(id);
};

const deactivatePackagePlan = async (id) => {
    const [result] = await db.query(
        `UPDATE package_plans
         SET status = 'INACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
};

const getVehicleForPackagePurchase = async ({ userId, vehicleId }) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.user_id AS userId,
            v.building_id AS buildingId,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status
         FROM vehicles v
         WHERE v.id = ? AND v.user_id = ?
         LIMIT 1`,
        [vehicleId, userId]
    );

    return rows[0] || null;
};

const createMotorbikePackagePurchase = async ({
    buildingId,
    endDate,
    packagePlanId,
    paymentUrl,
    price,
    startDate,
    transactionRef,
    userId,
    vehicleId,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [passResult] = await connection.query(
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
             VALUES (?, ?, ?, ?, 'MOTORBIKE', ?, 'PENDING_PAYMENT', ?, ?, ?)`,
            [
                userId,
                vehicleId,
                buildingId || null,
                packagePlanId,
                price,
                startDate,
                endDate,
                "User package purchase via VNPay",
            ]
        );

        const monthlyPassId = passResult.insertId;
        const [paymentResult] = await connection.query(
            `INSERT INTO payments
                (monthly_pass_id, provider, amount, status, transaction_ref, payment_url)
             VALUES (?, 'VNPAY', ?, 'PENDING', ?, ?)`,
            [monthlyPassId, price, transactionRef, paymentUrl]
        );

        await connection.commit();

        return {
            monthlyPassId,
            paymentId: paymentResult.insertId,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createMotorbikePackagePurchase,
    createPackagePlan,
    deactivatePackagePlan,
    getPackagePlanById,
    getPackagePlans,
    getVehicleForPackagePurchase,
    updatePackagePlan,
};
