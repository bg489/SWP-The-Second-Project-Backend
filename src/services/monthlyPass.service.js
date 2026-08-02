/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền monthlyPass.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/monthlyPass.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `monthlyPassSelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/monthlyPass.service.js.
 */
const monthlyPassSelect = `
    SELECT
        mp.id,
        mp.user_id AS userId,
        u.name AS ownerName,
        u.email AS ownerEmail,
        u.phone AS ownerPhone,
        u.role AS ownerRole,
        u.status AS ownerStatus,
        u.building_id AS ownerBuildingId,
        u.avatar_url AS ownerAvatarUrl,
        u.avatar_crop_x AS ownerAvatarCropX,
        u.avatar_crop_y AS ownerAvatarCropY,
        u.avatar_crop_zoom AS ownerAvatarCropZoom,
        u.created_at AS ownerCreatedAt,
        ub.name AS ownerBuildingName,
        ub.address AS ownerBuildingAddress,
        mp.vehicle_id AS vehicleId,
        v.plate_number AS plateNumber,
        v.brand AS vehicleBrand,
        v.color AS vehicleColor,
        v.status AS vehicleStatus,
        v.plate_image_url AS plateImageUrl,
        v.vehicle_portrait_image_url AS vehiclePortraitImageUrl,
        v.vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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
        qp.id AS qrPassId,
        qp.qr_code AS qrCode,
        qp.status AS qrStatus,
        qp.valid_from AS qrValidFrom,
        qp.valid_to AS qrValidTo,
        mp.created_at AS createdAt,
        mp.updated_at AS updatedAt
    FROM monthly_passes mp
    INNER JOIN vehicles v ON mp.vehicle_id = v.id
    LEFT JOIN users u ON mp.user_id = u.id
    LEFT JOIN buildings ub ON u.building_id = ub.id
    LEFT JOIN buildings b ON mp.building_id = b.id
    LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
    LEFT JOIN payments p ON p.monthly_pass_id = mp.id
    LEFT JOIN qr_passes qp ON qp.monthly_pass_id = mp.id
`;

/**
 * Lấy nghiệp vụ `getVehicleForMonthlyPass` (get vehicle for monthly pass). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getVehicleForMonthlyPass
 * @param {*} vehicleId - Giá trị `vehicleId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Tạo nghiệp vụ `createMonthlyPass` (create monthly pass). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createMonthlyPass
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getMonthlyPasses` (get monthly passes). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMonthlyPasses
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPasses = async ({ buildingId, status } = {}) => {
    const conditions = [];
    const params = [];

    if (buildingId) {
        conditions.push("mp.building_id = ?");
        params.push(buildingId);
    }

    if (status) {
        conditions.push("mp.status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${monthlyPassSelect}
         ${whereSql}
         ORDER BY mp.id DESC`,
        params
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getMyMonthlyPasses` (get my monthly passes). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMyMonthlyPasses
 * @param {*} userId - Giá trị `userId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyMonthlyPasses = async (userId) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.user_id = ?
         ORDER BY mp.id DESC`,
        [userId]
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getMonthlyPassById` (get monthly pass by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMonthlyPassById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPassById = async (id) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getMonthlyPassByIdAndUserId` (get monthly pass by id and user id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMonthlyPassByIdAndUserId
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPassByIdAndUserId = async ({ id, userId }) => {
    const [rows] = await db.query(
        `${monthlyPassSelect}
         WHERE mp.id = ? AND mp.user_id = ?
         LIMIT 1`,
        [id, userId]
    );

    return rows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updateMonthlyPassPaymentUrl` (update monthly pass payment url). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateMonthlyPassPaymentUrl
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
