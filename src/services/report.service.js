/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền report.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/report.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `SPECIAL_PARKING_VIOLATION_CODES` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/report.service.js.
 */
const SPECIAL_PARKING_VIOLATION_CODES = new Set([
    "WRONG_SLOT",
    "MOTORBIKE_WRONG_FLOOR",
    "CAR_WRONG_FLOOR_TOW",
]);

/**
 * Tạo nghiệp vụ `buildDateRange` (build date range). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildDateRange
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @param {*} column - Giá trị `column` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Thực hiện nghiệp vụ `appendCondition` (append condition). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function appendCondition
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @param {*} condition - Giá trị `condition` được hàm sử dụng trong quá trình xử lý.
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Lấy nghiệp vụ `getTrafficReport` (get traffic report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getTrafficReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getMotorbikeCapacityReport` (get motorbike capacity report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMotorbikeCapacityReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getCarSlotStatusReport` (get car slot status report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getCarSlotStatusReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getRevenueReport` (get revenue report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getRevenueReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getRevenueReport = async ({ from, to, buildingId } = {}) => {
    const { params, whereSql } = buildDateRange({ from, to }, "p.created_at");
    const sessionRange = buildDateRange({ from, to }, "ps.check_out_at");
    const paymentFilters = appendCondition(
        { params, whereSql },
        "COALESCE(ps.building_id, mp.building_id, sr.building_id, hsr.building_id) = ?",
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
         LEFT JOIN hourly_slot_reservations hsr ON hsr.payment_id = p.id
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
                WHEN hsr.id IS NOT NULL THEN 'HOURLY_RESERVATION'
                WHEN p.parking_session_id IS NOT NULL THEN 'PARKING_SESSION'
                ELSE 'OTHER'
            END AS sourceType,
            COALESCE(
                mp.vehicle_type,
                srv.vehicle_type,
                ps.vehicle_type,
                CASE WHEN hsr.id IS NOT NULL THEN 'CAR' END
            ) AS vehicleType,
            COALESCE(ps.customer_type, hsr.customer_type) AS customerType,
            p.status,
            COUNT(*) AS paymentCount,
            COALESCE(SUM(p.amount), 0) AS totalAmount,
            COALESCE(SUM(
                CASE
                    WHEN p.status = 'SUCCESS'
                        AND p.parking_session_id IS NOT NULL
                        AND ps.pricing_type IN ('TURN', 'HOURLY')
                    THEN LEAST(COALESCE(p.amount, 0), COALESCE(ps.base_fee, 0))
                    WHEN p.status = 'SUCCESS' AND hsr.id IS NOT NULL
                    THEN COALESCE(p.amount, 0)
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
                    THEN 1
                    WHEN p.status = 'SUCCESS'
                        AND hsr.id IS NOT NULL
                        AND COALESCE(p.amount, 0) > 0
                    THEN 1
                    ELSE 0
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
         LEFT JOIN hourly_slot_reservations hsr ON hsr.payment_id = p.id
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
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .filter((row) => row.status === "SUCCESS")
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const pendingPaymentTotal = sourceRows
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .filter((row) => row.status !== "SUCCESS")
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const monthlyPassRevenue = sourceRows
        .filter(
            /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            (row) =>
                row.status === "SUCCESS" &&
                ["MONTHLY_PASS", "SLOT_REGISTRATION"].includes(row.sourceType)
        )
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const walkInRevenue = sourceRows
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .filter((row) => row.status === "SUCCESS"
            && ["PARKING_SESSION", "HOURLY_RESERVATION"].includes(row.sourceType)
            && row.customerType === "WALK_IN_GUEST")
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const ticketRevenue = sourceRows.reduce(
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (sum, row) => sum + Number(row.ticketAmount || 0),
        0
    );
    const violationRevenue = sourceRows.reduce(
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (sum, row) => sum + Number(row.violationAmount || 0),
        0
    );
    /**
     * Tính toán nghiệp vụ `sumSource` (sum source). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function sumSource
     * @param {*} predicate - Giá trị `predicate` được hàm sử dụng trong quá trình xử lý.
     * @param {*} field - Giá trị `field` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const sumSource = (predicate, field = "totalAmount") => sourceRows
        .filter(predicate)
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row[field] || 0), 0);
    /**
     * Tính toán nghiệp vụ `countSource` (count source). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function countSource
     * @param {*} predicate - Giá trị `predicate` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const countSource = (predicate) => sourceRows
        .filter(predicate)
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.paymentCount || 0), 0);
    /**
     * Thực hiện nghiệp vụ `successfulMonthly` (successful monthly). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function successfulMonthly
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const successfulMonthly = (row) => row.status === "SUCCESS"
        && ["MONTHLY_PASS", "SLOT_REGISTRATION"].includes(row.sourceType);
    /**
     * Thực hiện nghiệp vụ `motorbikeMonthly` (motorbike monthly). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function motorbikeMonthly
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const motorbikeMonthly = (row) => successfulMonthly(row)
        && row.vehicleType === "MOTORBIKE";
    /**
     * Thực hiện nghiệp vụ `carMonthly` (car monthly). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function carMonthly
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const carMonthly = (row) => successfulMonthly(row)
        && row.vehicleType === "CAR";
    /**
     * Thực hiện nghiệp vụ `successfulSessionPayment` (successful session payment). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function successfulSessionPayment
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const successfulSessionPayment = (row) => row.status === "SUCCESS"
        && row.sourceType === "PARKING_SESSION";
    /**
     * Thực hiện nghiệp vụ `successfulTicketPayment` (successful ticket payment). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function successfulTicketPayment
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const successfulTicketPayment = (row) => row.status === "SUCCESS"
        && ["PARKING_SESSION", "HOURLY_RESERVATION"].includes(row.sourceType);
    /**
     * Thực hiện nghiệp vụ `motorbikeTickets` (motorbike tickets). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function motorbikeTickets
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const motorbikeTickets = (row) => successfulSessionPayment(row)
        && row.vehicleType === "MOTORBIKE";
    /**
     * Thực hiện nghiệp vụ `carTickets` (car tickets). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function carTickets
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const carTickets = (row) => successfulTicketPayment(row)
        && row.vehicleType === "CAR";
    /**
     * Thực hiện nghiệp vụ `otherPayments` (other payments). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function otherPayments
     * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
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
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (sum, row) => sum + Number(row.amount || 0),
        0
    );

    return {
        breakdown: revenueBreakdown,
        payments: summaryRows,
        paymentSources: sourceRows,
        sessions: sessionRows,
        completedMonthlyPayments: countSource(successfulMonthly),
        completedTicketPayments: sumSource(successfulTicketPayment, "ticketPaymentCount"),
        monthlyPassRevenue,
        paidRevenue: successfulPaymentTotal,
        pendingRevenue: pendingPaymentTotal,
        ticketRevenue,
        totalRevenue: categorizedRevenue,
        violationRevenue,
        walkInRevenue,
    };
};

/**
 * Lấy nghiệp vụ `getQrPassReport` (get qr pass report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPassReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getViolationReport` (get violation report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getViolationReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getMonthlyPassRevenueDetails` (get monthly pass revenue details). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMonthlyPassRevenueDetails
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .filter((row) => row.paymentStatus === "SUCCESS" || row.status === "PAID")
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paidCount = rows.filter(
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (row) => row.paymentStatus === "SUCCESS" || row.status === "PAID"
    ).length;

    return {
        rows,
        paidCount,
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        activeCount: rows.filter((row) => row.status === "ACTIVE" || row.status === "PAID").length,
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        expiredCount: rows.filter((row) => row.status === "EXPIRED").length,
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        pendingCount: rows.filter((row) => row.status === "PENDING_PAYMENT").length,
        totalPaid,
    };
};

/**
 * Lấy nghiệp vụ `getTicketRevenueSummary` (get ticket revenue summary). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getTicketRevenueSummary
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        completedCount: rows.reduce((sum, row) => sum + Number(row.completedCount || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        paidCount: rows.reduce((sum, row) => sum + Number(row.paidCount || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        parkingFeeTotal: rows.reduce((sum, row) => sum + Number(row.parkingFeeTotal || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        violationFeeTotal: rows.reduce((sum, row) => sum + Number(row.violationFeeTotal || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
    };
};

/**
 * Lấy nghiệp vụ `getWalkInRevenueSummary` (get walk in revenue summary). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getWalkInRevenueSummary
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        completedCount: rows.reduce((sum, row) => sum + Number(row.completedCount || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        parkingFeeTotal: rows.reduce((sum, row) => sum + Number(row.parkingFeeTotal || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        violationFeeTotal: rows.reduce((sum, row) => sum + Number(row.violationFeeTotal || 0), 0),
    };
};

/**
 * Lấy nghiệp vụ `getViolationRevenueDetails` (get violation revenue details). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getViolationRevenueDetails
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationRevenueDetails = async ({ from, to, buildingId } = {}) => {
    const range = buildDateRange({ from, to }, "p.created_at");
    const filters = appendCondition(range, "ps.building_id = ?", buildingId);
    const paidFilters = appendCondition(filters, "ps.payment_status = ?", "PAID");

    const [violationRows] = await db.query(
        `SELECT
            v.id AS violationId,
            vt.code AS violationCode,
            COALESCE(vt.name, v.violation_type) AS violationName,
            v.penalty_fee AS penaltyFee,
            v.detected_at AS detectedAt,
            v.evidence_url AS evidenceUrl,
            v.status AS violationStatus,
            ps.id AS sessionId,
            ps.user_id AS userId,
            ps.vehicle_id AS vehicleId,
            ps.plate_number AS plateNumber,
            ps.vehicle_type AS vehicleType,
            ps.customer_type AS customerType,
            ps.check_in_at AS checkInAt,
            ps.check_out_at AS checkOutAt,
            ps.payment_status AS paymentStatus,
            ps.building_id AS buildingId,
            b.name AS buildingName,
            owner.name AS ownerName,
            owner.email AS ownerEmail,
            owner.phone AS ownerPhone,
            vehicle.brand,
            vehicle.color,
            floor.name AS floorName,
            slot.slot_code AS slotCode
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
         LEFT JOIN vehicles vehicle ON ps.vehicle_id = vehicle.id
         LEFT JOIN buildings b ON ps.building_id = b.id
         LEFT JOIN parking_floors floor ON ps.floor_id = floor.id
         LEFT JOIN parking_slots slot ON ps.slot_id = slot.id
         ${paidFilters.whereSql}
         ORDER BY violationName ASC, v.detected_at DESC, v.id DESC`,
        paidFilters.params
    );

    const groupedViolations = new Map();

    /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    violationRows.forEach((row) => {
        const key = row.violationName || "Vi phạm chưa đặt tên";
        const group = groupedViolations.get(key) || {
            buildingNames: new Set(),
            paidPenalty: 0,
            plateNumbers: new Set(),
            relatedVehicles: new Map(),
            totalPenalty: 0,
            userNames: new Set(),
            vehicleTypes: new Set(),
            violationCount: 0,
            violationCodes: new Set(),
            violationName: key,
        };
        const penaltyFee = Number(row.penaltyFee || 0);
        const vehicleKey = row.sessionId
            ? `session-${row.sessionId}`
            : `vehicle-${row.vehicleId || row.buildingId || "none"}-${row.plateNumber}`;
        const relatedVehicle = group.relatedVehicles.get(vehicleKey) || {
            brand: row.brand || null,
            buildingId: row.buildingId ? Number(row.buildingId) : null,
            buildingName: row.buildingName || null,
            checkInAt: row.checkInAt || null,
            checkOutAt: row.checkOutAt || null,
            color: row.color || null,
            customerType: row.customerType || null,
            floorName: row.floorName || null,
            ownerEmail: row.ownerEmail || null,
            ownerName: row.ownerName || "Khách vãng lai",
            ownerPhone: row.ownerPhone || null,
            paidPenalty: 0,
            paymentStatus: row.paymentStatus || null,
            plateNumber: row.plateNumber,
            sessionId: row.sessionId ? Number(row.sessionId) : null,
            slotCode: row.slotCode || null,
            userId: row.userId ? Number(row.userId) : null,
            vehicleId: row.vehicleId ? Number(row.vehicleId) : null,
            vehicleType: row.vehicleType,
            violationCount: 0,
            violations: [],
        };

        group.violationCount += 1;
        group.totalPenalty += penaltyFee;
        group.paidPenalty += penaltyFee;
        if (row.buildingName) group.buildingNames.add(row.buildingName);
        group.userNames.add(row.ownerName || "Khách vãng lai");
        if (row.plateNumber) group.plateNumbers.add(row.plateNumber);
        if (row.vehicleType) group.vehicleTypes.add(row.vehicleType);
        if (row.violationCode) group.violationCodes.add(row.violationCode);

        relatedVehicle.violationCount += 1;
        relatedVehicle.paidPenalty += penaltyFee;
        relatedVehicle.violations.push({
            detectedAt: row.detectedAt,
            evidenceUrl: row.evidenceUrl || null,
            id: Number(row.violationId),
            penaltyFee,
            status: row.violationStatus,
            violationCode: row.violationCode || null,
        });
        group.relatedVehicles.set(vehicleKey, relatedVehicle);
        groupedViolations.set(key, group);
    });

    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const rows = [...groupedViolations.values()].map((group) => ({
        buildingNames: [...group.buildingNames].sort().join(", "),
        paidPenalty: group.paidPenalty,
        plateNumbers: [...group.plateNumbers].sort().join(", "),
        /* Callback nội bộ của lời gọi `sort`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        relatedVehicles: [...group.relatedVehicles.values()].sort((left, right) =>
            String(left.plateNumber || "").localeCompare(String(right.plateNumber || ""), "vi")
        ),
        totalPenalty: group.totalPenalty,
        userNames: [...group.userNames].sort().join(", "),
        vehicleTypes: [...group.vehicleTypes].sort().join(", "),
        violationCount: group.violationCount,
        violationCodes: [...group.violationCodes].sort(),
        violationName: group.violationName,
    /* Callback nội bộ của lời gọi `sort`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    })).sort((left, right) =>
        Number(right.paidPenalty || 0) - Number(left.paidPenalty || 0)
        || String(left.violationName).localeCompare(String(right.violationName), "vi")
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
        /**
         * Thực hiện nghiệp vụ `uniqueValues` (unique values). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
         *
         * @function uniqueValues
         * @param {*} key - Giá trị `key` được hàm sử dụng trong quá trình xử lý.
         * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
         */
        const uniqueValues = (key) => [...new Set(
            /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            unclassifiedRows.map((row) => row[key]).filter(Boolean)
        )].join(", ");
        const unclassifiedPenalty = unclassifiedRows.reduce(
            /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            (sum, row) => sum + Number(row.unclassifiedPenalty || 0),
            0
        );

        rows.push({
            buildingNames: uniqueValues("buildingName"),
            paidPenalty: unclassifiedPenalty,
            plateNumbers: uniqueValues("plateNumber"),
            /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            relatedVehicles: unclassifiedRows.map((row) => ({
                buildingName: row.buildingName || null,
                ownerName: row.ownerName || "Khách vãng lai",
                paidPenalty: Number(row.unclassifiedPenalty || 0),
                plateNumber: row.plateNumber,
                sessionId: Number(row.sessionId),
                violationCount: 1,
                violations: [],
            })),
            totalPenalty: unclassifiedPenalty,
            userNames: uniqueValues("ownerName"),
            vehicleTypes: null,
            violationCount: unclassifiedRows.length,
            violationCodes: [],
            violationName: "Phí vi phạm chưa phân loại",
        });
    }

    /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const specialRows = rows.filter((row) =>
        /* Callback nội bộ của lời gọi `some`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        row.violationCodes.some((code) => SPECIAL_PARKING_VIOLATION_CODES.has(code))
    );
    /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const regularRows = rows.filter((row) =>
        /* Callback nội bộ của lời gọi `some`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        !row.violationCodes.some((code) => SPECIAL_PARKING_VIOLATION_CODES.has(code))
    );

    return {
        rows,
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        paidPenalty: rows.reduce((sum, row) => sum + Number(row.paidPenalty || 0), 0),
        regularPaidPenalty: regularRows.reduce(
            /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            (sum, row) => sum + Number(row.paidPenalty || 0),
            0
        ),
        regularRows,
        specialPaidPenalty: specialRows.reduce(
            /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
            (sum, row) => sum + Number(row.paidPenalty || 0),
            0
        ),
        specialRows,
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        totalPenalty: rows.reduce((sum, row) => sum + Number(row.totalPenalty || 0), 0),
    };
};

/**
 * Lấy nghiệp vụ `getOperationsOverview` (get operations overview). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getOperationsOverview
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    active.forEach((row) => {
        const summary = byBuildingMap.get(Number(row.buildingId));
        if (summary) summary.activeSessions = Number(row.total || 0);
    });

    /**
     * Thực hiện nghiệp vụ `percentage` (percentage). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
     *
     * @function percentage
     * @param {*} value - Giá trị đầu vào cần xử lý.
     * @param {*} total - Giá trị `total` được hàm sử dụng trong quá trình xử lý.
     * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
     */
    const percentage = (value, total) => total > 0
        ? Number(((Number(value || 0) / total) * 100).toFixed(2))
        : 0;
    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const byBuilding = [...byBuildingMap.values()].map((summary) => ({
        ...summary,
        registeredUserPercentage: percentage(summary.registeredUserEntries, summary.entryCount),
        walkInGuestPercentage: percentage(summary.walkInGuestEntries, summary.entryCount),
    }));
    const totals = byBuilding.reduce(
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (result, row) => {
            /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Lấy nghiệp vụ `getCapacityOverview` (get capacity overview). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getCapacityOverview
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getFullReport` (get full report). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getFullReport
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
            buildingName: buildingId ? capacity[0]?.buildingName || null : null,
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
