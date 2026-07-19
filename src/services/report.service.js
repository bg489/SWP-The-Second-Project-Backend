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
            COALESCE(mp.vehicle_type, srv.vehicle_type, ps.vehicle_type) AS vehicleType,
            ps.customer_type AS customerType,
            p.status,
            COUNT(*) AS paymentCount,
            COALESCE(SUM(p.amount), 0) AS totalAmount,
            COALESCE(SUM(
                CASE
                    WHEN p.status = 'SUCCESS'
                        AND p.parking_session_id IS NOT NULL
                        AND ps.pricing_type IN ('TURN', 'HOURLY')
                    THEN LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0))
                    ELSE 0
                END
            ), 0) AS ticketAmount,
            COALESCE(SUM(
                CASE
                    WHEN p.status = 'SUCCESS' AND p.parking_session_id IS NOT NULL
                    THEN GREATEST(
                        COALESCE(p.amount, 0)
                        - CASE
                            WHEN ps.pricing_type IN ('TURN', 'HOURLY')
                            THEN LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0))
                            ELSE 0
                          END,
                        0
                    )
                    ELSE 0
                END
            ), 0) AS violationAmount,
            SUM(
                CASE
                    WHEN p.status = 'SUCCESS'
                        AND p.parking_session_id IS NOT NULL
                        AND ps.pricing_type IN ('TURN', 'HOURLY')
                        AND LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0)) > 0
                    THEN 1 ELSE 0
                END
            ) AS ticketPaymentCount,
            SUM(
                CASE
                    WHEN p.status = 'SUCCESS'
                        AND p.parking_session_id IS NOT NULL
                        AND GREATEST(
                            COALESCE(p.amount, 0)
                            - CASE
                                WHEN ps.pricing_type IN ('TURN', 'HOURLY')
                                THEN LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0))
                                ELSE 0
                              END,
                            0
                        ) > 0
                    THEN 1 ELSE 0
                END
            ) AS violationPaymentCount
         FROM payments p
         LEFT JOIN parking_sessions ps ON p.parking_session_id = ps.id
         LEFT JOIN monthly_passes mp ON p.monthly_pass_id = mp.id
         LEFT JOIN slot_registrations sr ON p.slot_registration_id = sr.id
         LEFT JOIN vehicles srv ON sr.vehicle_id = srv.id
         ${paymentFilters.whereSql}
         GROUP BY sourceType, vehicleType, customerType, p.status
         ORDER BY sourceType ASC, vehicleType ASC, customerType ASC, p.status ASC`,
        paymentFilters.params
    );

    const [sessionRows] = await db.query(
        `SELECT
            ps.pricing_type AS pricingType,
            ps.vehicle_type AS vehicleType,
            ps.customer_type AS customerType,
            COUNT(*) AS sessionCount,
            SUM(CASE WHEN ps.payment_status = 'PAID' THEN 1 ELSE 0 END) AS paidSessionCount,
            SUM(CASE WHEN ps.payment_status = 'PAID' AND ps.violation_fee > 0 THEN 1 ELSE 0 END) AS paidViolationCount,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.base_fee ELSE 0 END), 0) AS baseFeeTotal,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.violation_fee ELSE 0 END), 0) AS violationFeeTotal,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.total_amount ELSE 0 END), 0) AS totalAmount
         FROM parking_sessions ps
         ${
             sessionFilters.whereSql
                 ? `${sessionFilters.whereSql} AND ps.status = 'COMPLETED'`
                 : "WHERE ps.status = 'COMPLETED'"
         }
         GROUP BY ps.pricing_type, ps.vehicle_type, ps.customer_type
         ORDER BY ps.vehicle_type ASC, ps.pricing_type ASC, ps.customer_type ASC`,
        sessionFilters.params
    );

    const successfulPaymentTotal = sourceRows
        .filter((row) => row.status === "SUCCESS")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const pendingPaymentTotal = sourceRows
        .filter((row) => row.status !== "SUCCESS")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const monthlyPassRevenue = sourceRows
        .filter(
            (row) =>
                row.status === "SUCCESS" &&
                ["MONTHLY_PASS", "SLOT_REGISTRATION"].includes(row.sourceType)
        )
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const walkInRevenue = sourceRows
        .filter((row) => row.status === "SUCCESS"
            && row.sourceType === "PARKING_SESSION"
            && row.customerType === "WALK_IN_GUEST")
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const ticketRevenue = sourceRows.reduce(
        (sum, row) => sum + Number(row.ticketAmount || 0),
        0
    );
    const violationRevenue = sourceRows.reduce(
        (sum, row) => sum + Number(row.violationAmount || 0),
        0
    );
    const sumSource = (predicate, field = "totalAmount") => sourceRows
        .filter(predicate)
        .reduce((sum, row) => sum + Number(row[field] || 0), 0);
    const countSource = (predicate) => sourceRows
        .filter(predicate)
        .reduce((sum, row) => sum + Number(row.paymentCount || 0), 0);
    const successfulMonthly = (row) => row.status === "SUCCESS"
        && ["MONTHLY_PASS", "SLOT_REGISTRATION"].includes(row.sourceType);
    const motorbikeMonthly = (row) => successfulMonthly(row)
        && row.vehicleType === "MOTORBIKE";
    const carMonthly = (row) => successfulMonthly(row)
        && row.vehicleType === "CAR";
    const successfulSessionPayment = (row) => row.status === "SUCCESS"
        && row.sourceType === "PARKING_SESSION";
    const motorbikeTickets = (row) => successfulSessionPayment(row)
        && row.vehicleType === "MOTORBIKE";
    const carTickets = (row) => successfulSessionPayment(row)
        && row.vehicleType === "CAR";
    const otherPayments = (row) => row.status === "SUCCESS" && row.sourceType === "OTHER";
    const revenueBreakdown = [
        {
            key: "MOTORBIKE_MONTHLY_PASS",
            label: "Gói tháng xe máy",
            completedCount: countSource(motorbikeMonthly),
            amount: sumSource(motorbikeMonthly),
        },
        {
            key: "CAR_MONTHLY_PASS",
            label: "Gói tháng ô tô",
            completedCount: countSource(carMonthly),
            amount: sumSource(carMonthly),
        },
        {
            key: "MOTORBIKE_TICKET",
            label: "Vé lượt xe máy",
            completedCount: sumSource(motorbikeTickets, "ticketPaymentCount"),
            amount: sumSource(motorbikeTickets, "ticketAmount"),
        },
        {
            key: "CAR_TICKET",
            label: "Vé giờ ô tô",
            completedCount: sumSource(carTickets, "ticketPaymentCount"),
            amount: sumSource(carTickets, "ticketAmount"),
        },
        {
            key: "VIOLATION_FEE",
            label: "Phí vi phạm đã thu",
            completedCount: sumSource(successfulSessionPayment, "violationPaymentCount"),
            amount: violationRevenue,
        },
        {
            key: "OTHER_PAYMENT",
            label: "Khoản thu khác",
            completedCount: countSource(otherPayments),
            amount: sumSource(otherPayments),
        },
    ];
    const categorizedRevenue = revenueBreakdown.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
    );

    return {
        breakdown: revenueBreakdown,
        payments: summaryRows,
        paymentSources: sourceRows,
        sessions: sessionRows,
        completedMonthlyPayments: countSource(successfulMonthly),
        completedTicketPayments: sumSource(successfulSessionPayment, "ticketPaymentCount"),
        monthlyPassRevenue,
        paidRevenue: successfulPaymentTotal,
        pendingRevenue: pendingPaymentTotal,
        ticketRevenue,
        totalRevenue: categorizedRevenue,
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

const getMonthlyPassRevenueDetails = async ({ from, to, buildingId } = {}) => {
    const passRange = buildDateRange({ from, to }, "COALESCE(p.created_at, mp.created_at)");
    const slotRange = buildDateRange({ from, to }, "COALESCE(p.created_at, sr.created_at)");
    const passFilters = appendCondition(
        passRange,
        "mp.building_id = ?",
        buildingId
    );
    const slotFilters = appendCondition(
        slotRange,
        "sr.building_id = ?",
        buildingId
    );

    const [motorbikeRows] = await db.query(
        `SELECT
            'MONTHLY_PASS' AS sourceType,
            mp.id,
            u.id AS userId,
            u.name AS ownerName,
            v.plate_number AS plateNumber,
            mp.vehicle_type AS vehicleType,
            b.name AS buildingName,
            COALESCE(pp.name, 'Goi thang xe may') AS packageName,
            mp.amount,
            mp.status,
            p.status AS paymentStatus,
            mp.start_date AS startDate,
            mp.end_date AS endDate,
            p.created_at AS paidAt
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         LEFT JOIN users u ON mp.user_id = u.id
         LEFT JOIN buildings b ON mp.building_id = b.id
         LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
         LEFT JOIN payments p ON p.id = (
            SELECT p2.id
            FROM payments p2
            WHERE p2.monthly_pass_id = mp.id
            ORDER BY (p2.status = 'SUCCESS') DESC, p2.id DESC
            LIMIT 1
         )
         ${passFilters.whereSql}
         ORDER BY COALESCE(p.created_at, mp.created_at) DESC, mp.id DESC`,
        passFilters.params
    );

    const [carRows] = await db.query(
        `SELECT
            'SLOT_REGISTRATION' AS sourceType,
            sr.id,
            u.id AS userId,
            u.name AS ownerName,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            b.name AS buildingName,
            CONCAT('Goi thang oto - ', ps.slot_code) AS packageName,
            sr.amount,
            sr.status,
            p.status AS paymentStatus,
            sr.start_date AS startDate,
            sr.end_date AS endDate,
            p.created_at AS paidAt
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         LEFT JOIN users u ON sr.user_id = u.id
         LEFT JOIN buildings b ON sr.building_id = b.id
         LEFT JOIN parking_slots ps ON sr.slot_id = ps.id
         LEFT JOIN payments p ON p.id = (
            SELECT p2.id
            FROM payments p2
            WHERE p2.slot_registration_id = sr.id
            ORDER BY (p2.status = 'SUCCESS') DESC, p2.id DESC
            LIMIT 1
         )
         ${slotFilters.whereSql}
         ORDER BY COALESCE(p.created_at, sr.created_at) DESC, sr.id DESC`,
        slotFilters.params
    );

    const rows = [...motorbikeRows, ...carRows];
    const totalPaid = rows
        .filter((row) => row.paymentStatus === "SUCCESS" || row.status === "PAID")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paidCount = rows.filter(
        (row) => row.paymentStatus === "SUCCESS" || row.status === "PAID"
    ).length;

    return {
        rows,
        paidCount,
        activeCount: rows.filter((row) => row.status === "ACTIVE" || row.status === "PAID").length,
        expiredCount: rows.filter((row) => row.status === "EXPIRED").length,
        pendingCount: rows.filter((row) => row.status === "PENDING_PAYMENT").length,
        totalPaid,
    };
};

const getTicketRevenueSummary = async ({ from, to, buildingId } = {}) => {
    const range = buildDateRange({ from, to }, "ps.check_out_at");
    const filters = appendCondition(range, "ps.building_id = ?", buildingId);

    const [rows] = await db.query(
        `SELECT
            ps.vehicle_type AS vehicleType,
            ps.pricing_type AS pricingType,
            ps.customer_type AS customerType,
            COUNT(*) AS completedCount,
            SUM(CASE WHEN ps.payment_status = 'PAID' THEN 1 ELSE 0 END) AS paidCount,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.base_fee ELSE 0 END), 0) AS parkingFeeTotal,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.violation_fee ELSE 0 END), 0) AS violationFeeTotal,
            COALESCE(SUM(CASE WHEN ps.payment_status = 'PAID' THEN ps.total_amount ELSE 0 END), 0) AS totalAmount
         FROM parking_sessions ps
         ${
             filters.whereSql
                 ? `${filters.whereSql} AND ps.status = 'COMPLETED' AND ps.pricing_type IN ('TURN', 'HOURLY')`
                 : "WHERE ps.status = 'COMPLETED' AND ps.pricing_type IN ('TURN', 'HOURLY')"
         }
         GROUP BY ps.vehicle_type, ps.pricing_type, ps.customer_type
         ORDER BY ps.vehicle_type ASC, ps.pricing_type ASC, ps.customer_type ASC`,
        filters.params
    );

    return {
        rows,
        completedCount: rows.reduce((sum, row) => sum + Number(row.completedCount || 0), 0),
        paidCount: rows.reduce((sum, row) => sum + Number(row.paidCount || 0), 0),
        parkingFeeTotal: rows.reduce((sum, row) => sum + Number(row.parkingFeeTotal || 0), 0),
        violationFeeTotal: rows.reduce((sum, row) => sum + Number(row.violationFeeTotal || 0), 0),
        totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
    };
};

const getWalkInRevenueSummary = async ({ from, to, buildingId } = {}) => {
    const range = buildDateRange({ from, to }, "ps.check_out_at");
    const filters = appendCondition(range, "ps.building_id = ?", buildingId);

    const [rows] = await db.query(
        `SELECT
            ps.vehicle_type AS vehicleType,
            COUNT(*) AS completedCount,
            COALESCE(SUM(ps.base_fee), 0) AS parkingFeeTotal,
            COALESCE(SUM(ps.violation_fee), 0) AS violationFeeTotal,
            COALESCE(SUM(ps.total_amount), 0) AS totalAmount
         FROM parking_sessions ps
         ${
             filters.whereSql
                 ? `${filters.whereSql} AND ps.status = 'COMPLETED' AND ps.pricing_type IN ('TURN', 'HOURLY')`
                 : "WHERE ps.status = 'COMPLETED' AND ps.pricing_type IN ('TURN', 'HOURLY')"
         }
         GROUP BY ps.vehicle_type
         ORDER BY ps.vehicle_type ASC`,
        filters.params
    );

    return {
        rows,
        completedCount: rows.reduce((sum, row) => sum + Number(row.completedCount || 0), 0),
        parkingFeeTotal: rows.reduce((sum, row) => sum + Number(row.parkingFeeTotal || 0), 0),
        totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
        violationFeeTotal: rows.reduce((sum, row) => sum + Number(row.violationFeeTotal || 0), 0),
    };
};

const getViolationRevenueDetails = async ({ from, to, buildingId } = {}) => {
    const range = buildDateRange({ from, to }, "p.created_at");
    const filters = appendCondition(range, "ps.building_id = ?", buildingId);
    const paidFilters = appendCondition(filters, "ps.payment_status = ?", "PAID");

    const [rows] = await db.query(
        `SELECT
            COALESCE(vt.name, v.violation_type) AS violationName,
            COUNT(*) AS violationCount,
            COALESCE(SUM(v.penalty_fee), 0) AS totalPenalty,
            COALESCE(SUM(v.penalty_fee), 0) AS paidPenalty,
            GROUP_CONCAT(DISTINCT b.name ORDER BY b.name SEPARATOR ', ') AS buildingNames,
            GROUP_CONCAT(DISTINCT COALESCE(owner.name, 'Khach vang lai') ORDER BY owner.name SEPARATOR ', ') AS userNames,
            GROUP_CONCAT(DISTINCT v.plate_number ORDER BY v.plate_number SEPARATOR ', ') AS plateNumbers,
            GROUP_CONCAT(DISTINCT v.vehicle_type ORDER BY v.vehicle_type SEPARATOR ', ') AS vehicleTypes
         FROM violations v
         LEFT JOIN violation_types vt ON v.violation_type_id = vt.id
         INNER JOIN parking_sessions ps ON v.parking_session_id = ps.id
         INNER JOIN payments p ON p.id = (
            SELECT p2.id
            FROM payments p2
            WHERE p2.parking_session_id = ps.id AND p2.status = 'SUCCESS'
            ORDER BY p2.id DESC
            LIMIT 1
         )
         LEFT JOIN users owner ON ps.user_id = owner.id
         LEFT JOIN buildings b ON ps.building_id = b.id
         ${paidFilters.whereSql}
         GROUP BY COALESCE(vt.name, v.violation_type)
         ORDER BY paidPenalty DESC, totalPenalty DESC, violationName ASC`,
        paidFilters.params
    );

    const [unclassifiedRows] = await db.query(
        `SELECT
            ps.id AS sessionId,
            ps.plate_number AS plateNumber,
            COALESCE(owner.name, 'Khach vang lai') AS ownerName,
            b.name AS buildingName,
            GREATEST(
                COALESCE(p.amount, 0)
                - CASE
                    WHEN ps.pricing_type IN ('TURN', 'HOURLY')
                    THEN LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0))
                    ELSE 0
                  END
                - COALESCE(SUM(v.penalty_fee), 0),
                0
            ) AS unclassifiedPenalty
         FROM parking_sessions ps
         INNER JOIN payments p ON p.id = (
            SELECT p2.id
            FROM payments p2
            WHERE p2.parking_session_id = ps.id AND p2.status = 'SUCCESS'
            ORDER BY p2.id DESC
            LIMIT 1
         )
         LEFT JOIN violations v ON v.parking_session_id = ps.id
         LEFT JOIN users owner ON ps.user_id = owner.id
         LEFT JOIN buildings b ON ps.building_id = b.id
         ${paidFilters.whereSql}
         GROUP BY ps.id, ps.plate_number, owner.name, b.name, p.amount,
            ps.pricing_type, ps.base_fee
         HAVING unclassifiedPenalty > 0
         ORDER BY ps.id ASC`,
        paidFilters.params
    );

    if (unclassifiedRows.length > 0) {
        const uniqueValues = (key) => [...new Set(
            unclassifiedRows.map((row) => row[key]).filter(Boolean)
        )].join(", ");
        const unclassifiedPenalty = unclassifiedRows.reduce(
            (sum, row) => sum + Number(row.unclassifiedPenalty || 0),
            0
        );

        rows.push({
            buildingNames: uniqueValues("buildingName"),
            paidPenalty: unclassifiedPenalty,
            plateNumbers: uniqueValues("plateNumber"),
            totalPenalty: unclassifiedPenalty,
            userNames: uniqueValues("ownerName"),
            vehicleTypes: null,
            violationCount: unclassifiedRows.length,
            violationName: "Phí vi phạm chưa phân loại",
        });
    }

    return {
        rows,
        paidPenalty: rows.reduce((sum, row) => sum + Number(row.paidPenalty || 0), 0),
        totalPenalty: rows.reduce((sum, row) => sum + Number(row.totalPenalty || 0), 0),
    };
};

const getOperationsOverview = async ({ from, to, buildingId } = {}) => {
    const entryFilters = appendCondition(
        buildDateRange({ from, to }, "ps.check_in_at"),
        "ps.building_id = ?",
        buildingId
    );
    const exitFilters = appendCondition(
        buildDateRange({ from, to }, "ps.check_out_at"),
        "ps.building_id = ?",
        buildingId
    );
    const buildingWhere = buildingId ? "WHERE b.id = ?" : "";
    const buildingParams = buildingId ? [buildingId] : [];
    const activeWhere = buildingId
        ? "WHERE ps.status IN ('ACTIVE', 'PENDING_PAYMENT') AND ps.building_id = ?"
        : "WHERE ps.status IN ('ACTIVE', 'PENDING_PAYMENT')";
    const activeParams = buildingId ? [buildingId] : [];

    const [buildingRows, entryRows, exitRows, activeRows] = await Promise.all([
        db.query(
            `SELECT b.id AS buildingId, b.name AS buildingName, b.address AS buildingAddress
             FROM buildings b
             ${buildingWhere}
             ORDER BY b.id ASC`,
            buildingParams
        ),
        db.query(
            `SELECT
                ps.building_id AS buildingId,
                ps.vehicle_type AS vehicleType,
                ps.customer_type AS customerType,
                COUNT(*) AS total
             FROM parking_sessions ps
             ${entryFilters.whereSql}
             GROUP BY ps.building_id, ps.vehicle_type, ps.customer_type`,
            entryFilters.params
        ),
        db.query(
            `SELECT
                ps.building_id AS buildingId,
                ps.vehicle_type AS vehicleType,
                ps.customer_type AS customerType,
                ps.pricing_type AS pricingType,
                COUNT(*) AS total
             FROM parking_sessions ps
             ${
                 exitFilters.whereSql
                     ? `${exitFilters.whereSql} AND ps.status = 'COMPLETED'`
                     : "WHERE ps.status = 'COMPLETED'"
             }
             GROUP BY ps.building_id, ps.vehicle_type, ps.customer_type, ps.pricing_type`,
            exitFilters.params
        ),
        db.query(
            `SELECT ps.building_id AS buildingId, COUNT(*) AS total
             FROM parking_sessions ps
             ${activeWhere}
             GROUP BY ps.building_id`,
            activeParams
        ),
    ]);

    const buildings = buildingRows[0];
    const entries = entryRows[0];
    const exits = exitRows[0];
    const active = activeRows[0];
    const byBuildingMap = new Map(
        buildings.map((building) => [Number(building.buildingId), {
            ...building,
            activeSessions: 0,
            carEntries: 0,
            carExits: 0,
            entryCount: 0,
            exitCount: 0,
            hourlyTicketsCompleted: 0,
            monthlyPassSessionsCompleted: 0,
            motorbikeEntries: 0,
            motorbikeExits: 0,
            registeredUserEntries: 0,
            turnTicketsCompleted: 0,
            walkInGuestEntries: 0,
        }])
    );

    entries.forEach((row) => {
        const summary = byBuildingMap.get(Number(row.buildingId));
        if (!summary) return;
        const total = Number(row.total || 0);
        summary.entryCount += total;
        if (row.customerType === "REGISTERED_USER") summary.registeredUserEntries += total;
        if (row.customerType === "WALK_IN_GUEST") summary.walkInGuestEntries += total;
        if (row.vehicleType === "MOTORBIKE") summary.motorbikeEntries += total;
        if (row.vehicleType === "CAR") summary.carEntries += total;
    });

    exits.forEach((row) => {
        const summary = byBuildingMap.get(Number(row.buildingId));
        if (!summary) return;
        const total = Number(row.total || 0);
        summary.exitCount += total;
        if (row.vehicleType === "MOTORBIKE") summary.motorbikeExits += total;
        if (row.vehicleType === "CAR") summary.carExits += total;
        if (row.pricingType === "MONTHLY_PASS") summary.monthlyPassSessionsCompleted += total;
        if (row.pricingType === "TURN") summary.turnTicketsCompleted += total;
        if (row.pricingType === "HOURLY") summary.hourlyTicketsCompleted += total;
    });

    active.forEach((row) => {
        const summary = byBuildingMap.get(Number(row.buildingId));
        if (summary) summary.activeSessions = Number(row.total || 0);
    });

    const percentage = (value, total) => total > 0
        ? Number(((Number(value || 0) / total) * 100).toFixed(2))
        : 0;
    const byBuilding = [...byBuildingMap.values()].map((summary) => ({
        ...summary,
        registeredUserPercentage: percentage(summary.registeredUserEntries, summary.entryCount),
        walkInGuestPercentage: percentage(summary.walkInGuestEntries, summary.entryCount),
    }));
    const totals = byBuilding.reduce(
        (result, row) => {
            Object.keys(result).forEach((key) => {
                result[key] += Number(row[key] || 0);
            });
            return result;
        },
        {
            activeSessions: 0,
            carEntries: 0,
            carExits: 0,
            entryCount: 0,
            exitCount: 0,
            hourlyTicketsCompleted: 0,
            monthlyPassSessionsCompleted: 0,
            motorbikeEntries: 0,
            motorbikeExits: 0,
            registeredUserEntries: 0,
            turnTicketsCompleted: 0,
            walkInGuestEntries: 0,
        }
    );
    totals.ticketSessionsCompleted = totals.turnTicketsCompleted + totals.hourlyTicketsCompleted;
    totals.completedSessions = totals.ticketSessionsCompleted + totals.monthlyPassSessionsCompleted;

    return {
        byBuilding,
        customerMix: {
            registeredUser: {
                count: totals.registeredUserEntries,
                percentage: percentage(totals.registeredUserEntries, totals.entryCount),
            },
            walkInGuest: {
                count: totals.walkInGuestEntries,
                percentage: percentage(totals.walkInGuestEntries, totals.entryCount),
            },
        },
        totals,
        vehicleMix: {
            car: { entries: totals.carEntries, exits: totals.carExits },
            motorbike: { entries: totals.motorbikeEntries, exits: totals.motorbikeExits },
        },
    };
};

const getCapacityOverview = async ({ buildingId } = {}) => {
    const buildingWhere = buildingId ? "WHERE b.id = ?" : "";
    const params = buildingId ? [buildingId] : [];

    const [rows] = await db.query(
        `SELECT
            b.id AS buildingId,
            b.name AS buildingName,
            b.address AS buildingAddress,
            COALESCE(mb.motorbikeCapacity, 0) AS motorbikeCapacity,
            COALESCE(mb.motorbikeCurrent, 0) AS motorbikeCurrent,
            COALESCE(mp.activeMotorbikePasses, 0) AS motorbikeMonthlyPasses,
            GREATEST(
                COALESCE(mb.motorbikeCapacity, 0)
                - COALESCE(mb.motorbikeCurrent, 0)
                - COALESCE(mp.activeMotorbikePasses, 0),
                0
            ) AS effectiveMotorbikeRemaining,
            COALESCE(car.totalSlots, 0) AS carTotalSlots,
            COALESCE(car.occupiedSlots, 0) AS carOccupiedSlots,
            COALESCE(car.reservedSlots, 0) AS carReservedSlots,
            COALESCE(sr.activeCarMonthlySlots, 0) AS carMonthlySlots
         FROM buildings b
         LEFT JOIN (
            SELECT
                building_id,
                COALESCE(SUM(capacity), 0) AS motorbikeCapacity,
                COALESCE(SUM(current_count), 0) AS motorbikeCurrent
            FROM parking_floors
            WHERE floor_type = 'MOTORBIKE'
            GROUP BY building_id
         ) mb ON mb.building_id = b.id
         LEFT JOIN (
            SELECT
                building_id,
                COUNT(*) AS activeMotorbikePasses
            FROM monthly_passes
            WHERE vehicle_type = 'MOTORBIKE'
                AND status = 'ACTIVE'
                AND end_date >= CURRENT_DATE
            GROUP BY building_id
         ) mp ON mp.building_id = b.id
         LEFT JOIN (
            SELECT
                building_id,
                COUNT(*) AS totalSlots,
                SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupiedSlots,
                SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) AS reservedSlots
            FROM parking_slots
            GROUP BY building_id
         ) car ON car.building_id = b.id
         LEFT JOIN (
            SELECT
                building_id,
                COUNT(*) AS activeCarMonthlySlots
            FROM slot_registrations
            WHERE status = 'PAID'
                AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            GROUP BY building_id
         ) sr ON sr.building_id = b.id
         ${buildingWhere}
         ORDER BY b.id ASC`,
        params
    );

    return rows;
};

const getFullReport = async ({ from, to, buildingId } = {}) => {
    const [
        revenue,
        monthlyPasses,
        tickets,
        walkIns,
        violations,
        capacity,
        traffic,
        qrPasses,
        operations,
    ] = await Promise.all([
        getRevenueReport({ from, to, buildingId }),
        getMonthlyPassRevenueDetails({ from, to, buildingId }),
        getTicketRevenueSummary({ from, to, buildingId }),
        getWalkInRevenueSummary({ from, to, buildingId }),
        getViolationRevenueDetails({ from, to, buildingId }),
        getCapacityOverview({ buildingId }),
        getTrafficReport({ from, to, buildingId }),
        getQrPassReport({ buildingId }),
        getOperationsOverview({ from, to, buildingId }),
    ]);

    return {
        capacity,
        generatedAt: new Date().toISOString(),
        monthlyPasses,
        operations,
        qrPasses,
        range: { from, to },
        revenue,
        scope: {
            buildingCount: capacity.length,
            buildingId: buildingId ? Number(buildingId) : null,
            type: buildingId ? "BUILDING" : "SYSTEM",
        },
        tickets,
        traffic,
        violations,
        walkIns,
    };
};

module.exports = {
    getCarSlotStatusReport,
    getCapacityOverview,
    getFullReport,
    getMotorbikeCapacityReport,
    getMonthlyPassRevenueDetails,
    getOperationsOverview,
    getQrPassReport,
    getRevenueReport,
    getTrafficReport,
    getTicketRevenueSummary,
    getViolationRevenueDetails,
    getViolationReport,
    getWalkInRevenueSummary,
};
