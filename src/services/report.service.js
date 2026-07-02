const db = require("../config/db");

const buildDateRange = ({ from, to }, column) => {
    const conditions = [];
    const params = [];

    if (from) {
        conditions.push(`${column} >= ?`);
        params.push(String(from).length === 10 ? `${from} 00:00:00` : from);
    }

    if (to) {
        conditions.push(`${column} <= ?`);
        params.push(String(to).length === 10 ? `${to} 23:59:59` : to);
    }

    return {
        params,
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    };
};

const appendCondition = ({ whereSql, params }, condition, value) => {
    if (!value) {
        return { whereSql, params };
    }

    return {
        whereSql: whereSql
            ? `${whereSql} AND ${condition}`
            : `WHERE ${condition}`,
        params: [...params, value],
    };
};

const getTrafficReport = async ({ from, to, buildingId } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "check_in_at");
    const filters = appendCondition(
        { params, whereSql },
        "building_id = ?",
        buildingId
    );

    const [rows] = await db.query(
        `SELECT
            DATE(check_in_at) AS date,
            HOUR(check_in_at) AS hour,
            vehicle_type AS vehicleType,
            customer_type AS customerType,
            COUNT(*) AS entryCount,
            SUM(CASE WHEN check_out_at IS NOT NULL THEN 1 ELSE 0 END) AS exitCount
         FROM parking_sessions
         ${filters.whereSql}
         GROUP BY DATE(check_in_at), HOUR(check_in_at), vehicle_type, customer_type
         ORDER BY date DESC, hour DESC, vehicle_type ASC`,
        filters.params
    );

    return rows;
};

const getMotorbikeCapacityReport = async ({ buildingId } = {}) => {
    const buildingFilter = buildingId ? "AND pf.building_id = ?" : "";
    const params = buildingId ? [buildingId] : [];

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
            ${buildingFilter}
         ORDER BY pf.id ASC`
        ,
        params
    );

    return rows;
};

const getCarSlotStatusReport = async ({ buildingId } = {}) => {
    const buildingFilter = buildingId ? "AND pf.building_id = ?" : "";
    const params = buildingId ? [buildingId] : [];

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
            ${buildingFilter}
         GROUP BY pf.id, pf.building_id, b.name, pf.name, ps.status
         ORDER BY pf.id ASC, ps.status ASC`
        ,
        params
    );

    return rows;
};

const getRevenueReport = async ({ from, to, buildingId } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "p.created_at");
    const sessionRange = buildDateRange({ from, to }, "ps.check_out_at");
    const paymentFilters = appendCondition(
        { params, whereSql },
        "COALESCE(ps.building_id, mp.building_id, sr.building_id) = ?",
        buildingId
    );
    const sessionFilters = appendCondition(
        sessionRange,
        "ps.building_id = ?",
        buildingId
    );

    const [summaryRows] = await db.query(
        `SELECT
            p.provider,
            p.status,
            COUNT(*) AS paymentCount,
            COALESCE(SUM(p.amount), 0) AS totalAmount
         FROM payments p
         LEFT JOIN parking_sessions ps ON p.parking_session_id = ps.id
         LEFT JOIN monthly_passes mp ON p.monthly_pass_id = mp.id
         LEFT JOIN slot_registrations sr ON p.slot_registration_id = sr.id
         ${paymentFilters.whereSql}
         GROUP BY p.provider, p.status
         ORDER BY p.provider ASC, p.status ASC`,
        paymentFilters.params
    );

    const [sourceRows] = await db.query(
        `SELECT
            CASE
                WHEN p.monthly_pass_id IS NOT NULL THEN 'MONTHLY_PASS'
                WHEN p.slot_registration_id IS NOT NULL THEN 'SLOT_REGISTRATION'
                WHEN p.parking_session_id IS NOT NULL THEN 'PARKING_SESSION'
                ELSE 'OTHER'
            END AS sourceType,
            p.status,
            COUNT(*) AS paymentCount,
            COALESCE(SUM(p.amount), 0) AS totalAmount
         FROM payments p
         LEFT JOIN parking_sessions ps ON p.parking_session_id = ps.id
         LEFT JOIN monthly_passes mp ON p.monthly_pass_id = mp.id
         LEFT JOIN slot_registrations sr ON p.slot_registration_id = sr.id
         ${paymentFilters.whereSql}
         GROUP BY sourceType, p.status
         ORDER BY sourceType ASC, p.status ASC`,
        paymentFilters.params
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
             sessionFilters.whereSql
                 ? `${sessionFilters.whereSql} AND ps.status = 'COMPLETED'`
                 : "WHERE ps.status = 'COMPLETED'"
         }
         GROUP BY ps.pricing_type, ps.vehicle_type
         ORDER BY ps.vehicle_type ASC, ps.pricing_type ASC`,
        sessionFilters.params
    );

    const successfulPaymentTotal = sourceRows
        .filter((row) => row.status === "SUCCESS")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const pendingPaymentTotal = sourceRows
        .filter((row) => row.status !== "SUCCESS")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const sessionTotal = sessionRows.reduce(
        (sum, row) => sum + Number(row.totalAmount || 0),
        0
    );
    const monthlyPassRevenue = sourceRows
        .filter(
            (row) =>
                row.status === "SUCCESS" &&
                ["MONTHLY_PASS", "SLOT_REGISTRATION"].includes(row.sourceType)
        )
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const walkInRevenue = sourceRows
        .filter((row) => row.status === "SUCCESS" && row.sourceType === "PARKING_SESSION")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const violationRevenue = sessionRows.reduce(
        (sum, row) => sum + Number(row.violationFeeTotal || 0),
        0
    );

    return {
        payments: summaryRows,
        paymentSources: sourceRows,
        sessions: sessionRows,
        monthlyPassRevenue,
        paidRevenue: successfulPaymentTotal,
        pendingRevenue: pendingPaymentTotal,
        totalRevenue: successfulPaymentTotal || sessionTotal,
        violationRevenue,
        walkInRevenue,
    };
};

const getQrPassReport = async ({ buildingId } = {}) => {
    const buildingFilter = buildingId ? "WHERE v.building_id = ?" : "";
    const params = buildingId ? [buildingId] : [];

    const [statusRows] = await db.query(
        `SELECT
            qp.pass_type AS passType,
            qp.status,
            COUNT(*) AS total
         FROM qr_passes qp
         INNER JOIN vehicles v ON qp.vehicle_id = v.id
         ${buildingFilter}
         GROUP BY qp.pass_type, qp.status
         ORDER BY qp.pass_type ASC, qp.status ASC`,
        params
    );

    const [expiryRows] = await db.query(
        `SELECT
            qp.pass_type AS passType,
            COUNT(*) AS expiringSoon
         FROM qr_passes qp
         INNER JOIN vehicles v ON qp.vehicle_id = v.id
         WHERE qp.status = 'ACTIVE'
            AND qp.valid_to BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
            ${buildingId ? "AND v.building_id = ?" : ""}
         GROUP BY qp.pass_type`,
        params
    );

    return {
        byStatus: statusRows,
        expiringSoon: expiryRows,
    };
};

const getViolationReport = async ({ from, to, buildingId } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "detected_at");
    const filters = appendCondition(
        { params, whereSql },
        "ps.building_id = ?",
        buildingId
    );

    const [rows] = await db.query(
        `SELECT
            v.vehicle_type AS vehicleType,
            v.violation_type AS violationType,
            v.status,
            COUNT(*) AS total,
            COALESCE(SUM(v.penalty_fee), 0) AS penaltyTotal
         FROM violations v
         LEFT JOIN parking_sessions ps ON v.parking_session_id = ps.id
         ${filters.whereSql}
         GROUP BY v.vehicle_type, v.violation_type, v.status
         ORDER BY v.vehicle_type ASC, v.violation_type ASC, v.status ASC`,
        filters.params
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
