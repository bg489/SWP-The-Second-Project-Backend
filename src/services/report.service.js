const db = require("../config/db");

const buildDateRange = ({ from, to }, column) => {
    const conditions = [];
    const params = [];

    if (from) {
        conditions.push(`${column} >= ?`);
        params.push(from);
    }

    if (to) {
        conditions.push(`${column} <= ?`);
        params.push(to);
    }

    return {
        params,
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    };
};

const getTrafficReport = async ({ from, to } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "check_in_at");

    const [rows] = await db.query(
        `SELECT
            DATE(check_in_at) AS date,
            HOUR(check_in_at) AS hour,
            vehicle_type AS vehicleType,
            customer_type AS customerType,
            COUNT(*) AS entryCount,
            SUM(CASE WHEN check_out_at IS NOT NULL THEN 1 ELSE 0 END) AS exitCount
         FROM parking_sessions
         ${whereSql}
         GROUP BY DATE(check_in_at), HOUR(check_in_at), vehicle_type, customer_type
         ORDER BY date DESC, hour DESC, vehicle_type ASC`,
        params
    );

    return rows;
};

const getMotorbikeCapacityReport = async () => {
    const [rows] = await db.query(
        `SELECT
            pf.id AS floorId,
            pf.building_id AS buildingId,
            b.name AS buildingName,
            pf.name AS floorName,
            pf.capacity,
            pf.current_count AS currentCount,
            GREATEST(pf.capacity - pf.current_count, 0) AS remainingCapacity,
            pf.status
         FROM parking_floors pf
         INNER JOIN buildings b ON pf.building_id = b.id
         WHERE pf.floor_type = 'MOTORBIKE'
         ORDER BY pf.id ASC`
    );

    return rows;
};

const getCarSlotStatusReport = async () => {
    const [rows] = await db.query(
        `SELECT
            pf.id AS floorId,
            pf.building_id AS buildingId,
            b.name AS buildingName,
            pf.name AS floorName,
            ps.status,
            COUNT(ps.id) AS total
         FROM parking_floors pf
         INNER JOIN buildings b ON pf.building_id = b.id
         LEFT JOIN parking_slots ps ON pf.id = ps.floor_id
         WHERE pf.floor_type = 'CAR'
         GROUP BY pf.id, pf.building_id, b.name, pf.name, ps.status
         ORDER BY pf.id ASC, ps.status ASC`
    );

    return rows;
};

const getRevenueReport = async ({ from, to } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "p.created_at");
    const sessionRange = buildDateRange({ from, to }, "ps.check_out_at");

    const [summaryRows] = await db.query(
        `SELECT
            p.provider,
            p.status,
            COUNT(*) AS paymentCount,
            COALESCE(SUM(p.amount), 0) AS totalAmount
         FROM payments p
         ${whereSql}
         GROUP BY p.provider, p.status
         ORDER BY p.provider ASC, p.status ASC`,
        params
    );

    const [sessionRows] = await db.query(
        `SELECT
            ps.pricing_type AS pricingType,
            ps.vehicle_type AS vehicleType,
            COUNT(*) AS sessionCount,
            COALESCE(SUM(ps.base_fee), 0) AS baseFeeTotal,
            COALESCE(SUM(ps.violation_fee), 0) AS violationFeeTotal,
            COALESCE(SUM(ps.total_amount), 0) AS totalAmount
         FROM parking_sessions ps
         ${
             sessionRange.whereSql
                 ? `${sessionRange.whereSql} AND ps.status = 'COMPLETED'`
                 : "WHERE ps.status = 'COMPLETED'"
         }
         GROUP BY ps.pricing_type, ps.vehicle_type
         ORDER BY ps.vehicle_type ASC, ps.pricing_type ASC`,
        sessionRange.params
    );

    return {
        payments: summaryRows,
        sessions: sessionRows,
    };
};

const getQrPassReport = async () => {
    const [statusRows] = await db.query(
        `SELECT
            pass_type AS passType,
            status,
            COUNT(*) AS total
         FROM qr_passes
         GROUP BY pass_type, status
         ORDER BY pass_type ASC, status ASC`
    );

    const [expiryRows] = await db.query(
        `SELECT
            pass_type AS passType,
            COUNT(*) AS expiringSoon
         FROM qr_passes
         WHERE status = 'ACTIVE'
            AND valid_to BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
         GROUP BY pass_type`
    );

    return {
        byStatus: statusRows,
        expiringSoon: expiryRows,
    };
};

const getViolationReport = async ({ from, to } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "detected_at");

    const [rows] = await db.query(
        `SELECT
            vehicle_type AS vehicleType,
            violation_type AS violationType,
            status,
            COUNT(*) AS total,
            COALESCE(SUM(penalty_fee), 0) AS penaltyTotal
         FROM violations
         ${whereSql}
         GROUP BY vehicle_type, violation_type, status
         ORDER BY vehicle_type ASC, violation_type ASC, status ASC`,
        params
    );

    return rows;
};

module.exports = {
    getCarSlotStatusReport,
    getMotorbikeCapacityReport,
    getQrPassReport,
    getRevenueReport,
    getTrafficReport,
    getViolationReport,
};
