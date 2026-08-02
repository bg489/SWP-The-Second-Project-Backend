/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền qrPass.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `crypto` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/qrPass.service.js.
 */
const crypto = require("crypto");
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/qrPass.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `qrPassSelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/qrPass.service.js.
 */
const qrPassSelect = `
    SELECT
        qp.id,
        qp.user_id AS userId,
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
        qp.vehicle_id AS vehicleId,
        v.plate_number AS plateNumber,
        v.vehicle_type AS vehicleType,
        v.brand AS vehicleBrand,
        v.color AS vehicleColor,
        v.status AS vehicleStatus,
        v.plate_image_url AS plateImageUrl,
        v.vehicle_portrait_image_url AS vehiclePortraitImageUrl,
        v.vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
        qp.monthly_pass_id AS monthlyPassId,
        qp.slot_registration_id AS slotRegistrationId,
        qp.qr_code AS qrCode,
        qp.pass_type AS passType,
        qp.status,
        mp.package_plan_id AS packagePlanId,
        pp.name AS packagePlanName,
        COALESCE(mp.amount, sr.amount) AS amount,
        COALESCE(mp.building_id, sr.building_id) AS buildingId,
        b.name AS buildingName,
        mp.start_date AS monthlyPassStartDate,
        mp.end_date AS monthlyPassEndDate,
        sr.slot_id AS slotId,
        ps.floor_id AS slotFloorId,
        pf.name AS slotFloorName,
        ps.slot_code AS slotCode,
        qp.valid_from AS validFrom,
        qp.valid_to AS validTo,
        qp.created_by AS createdBy,
        qp.note,
        qp.created_at AS createdAt,
        qp.updated_at AS updatedAt
    FROM qr_passes qp
    INNER JOIN vehicles v ON qp.vehicle_id = v.id
    LEFT JOIN users u ON qp.user_id = u.id
    LEFT JOIN buildings ub ON u.building_id = ub.id
    LEFT JOIN monthly_passes mp ON qp.monthly_pass_id = mp.id
    LEFT JOIN package_plans pp ON mp.package_plan_id = pp.id
    LEFT JOIN slot_registrations sr ON qp.slot_registration_id = sr.id
    LEFT JOIN parking_slots ps ON sr.slot_id = ps.id
    LEFT JOIN parking_floors pf ON ps.floor_id = pf.id
    LEFT JOIN buildings b ON COALESCE(mp.building_id, sr.building_id) = b.id
`;

/**
 * Thực hiện nghiệp vụ `generateQrCode` (generate qr code). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function generateQrCode
 * @param {*} prefix - Giá trị `prefix` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const generateQrCode = (prefix = "QR") => {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizePlateCode` (normalize plate code). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function normalizePlateCode
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizePlateCode = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[\s.-]/g, "");

/**
 * Lấy nghiệp vụ `getMonthlyPassForQr` (get monthly pass for qr). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getMonthlyPassForQr
 * @param {*} monthlyPassId - Giá trị `monthlyPassId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPassForQr = async (monthlyPassId) => {
    const [rows] = await db.query(
        `SELECT
            mp.id,
            mp.user_id AS userId,
            mp.vehicle_id AS vehicleId,
            mp.status,
            mp.start_date AS startDate,
            mp.end_date AS endDate,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status AS vehicleStatus
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         WHERE mp.id = ?
         LIMIT 1`,
        [monthlyPassId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getSlotRegistrationForQr` (get slot registration for qr). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getSlotRegistrationForQr
 * @param {*} slotRegistrationId - Giá trị `slotRegistrationId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getSlotRegistrationForQr = async (slotRegistrationId) => {
    const [rows] = await db.query(
        `SELECT
            sr.id,
            sr.user_id AS userId,
            sr.vehicle_id AS vehicleId,
            sr.status,
            sr.start_date AS startDate,
            sr.end_date AS endDate,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.status AS vehicleStatus
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         WHERE sr.id = ?
         LIMIT 1`,
        [slotRegistrationId]
    );

    return rows[0] || null;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `formatDateOnly` (format date only). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function formatDateOnly
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const formatDateOnly = (date) => {
    if (date instanceof Date) {
        return date.toISOString().slice(0, 10);
    }

    return String(date).slice(0, 10);
};

/**
 * Tạo nghiệp vụ `buildValidDateTime` (build valid date time). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildValidDateTime
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @param {*} endOfDay - Giá trị `endOfDay` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildValidDateTime = (date, endOfDay = false) => {
    const suffix = endOfDay ? " 23:59:59" : " 00:00:00";
    return `${formatDateOnly(date)}${suffix}`;
};

/**
 * Tạo nghiệp vụ `createQrPassForMonthlyPass` (create qr pass for monthly pass). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createQrPassForMonthlyPass
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createQrPassForMonthlyPass = async ({ createdBy, monthlyPassId, note }) => {
    const monthlyPass = await getMonthlyPassForQr(monthlyPassId);

    if (!monthlyPass) {
        const error = new Error("Khong tim thay the thang");
        error.statusCode = 404;
        throw error;
    }

    if (monthlyPass.status !== "ACTIVE") {
        const error = new Error("The thang phai ACTIVE moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    if (monthlyPass.vehicleStatus !== "APPROVED") {
        const error = new Error("Xe phai duoc duyet moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    const qrCode = generateQrCode("MONTHLY");

    await db.query(
        `INSERT INTO qr_passes
            (
                user_id,
                vehicle_id,
                monthly_pass_id,
                qr_code,
                pass_type,
                status,
                valid_from,
                valid_to,
                created_by,
                note
            )
         VALUES (?, ?, ?, ?, 'MONTHLY', 'ACTIVE', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            valid_from = VALUES(valid_from),
            valid_to = VALUES(valid_to),
            created_by = VALUES(created_by),
            note = VALUES(note),
            updated_at = CURRENT_TIMESTAMP`,
        [
            monthlyPass.userId || null,
            monthlyPass.vehicleId,
            monthlyPass.id,
            qrCode,
            buildValidDateTime(monthlyPass.startDate),
            buildValidDateTime(monthlyPass.endDate, true),
            createdBy || null,
            note || null,
        ]
    );

    return getQrPassByMonthlyPassId(monthlyPassId);
};

/**
 * Tạo nghiệp vụ `createQrPassForSlotRegistration` (create qr pass for slot registration). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createQrPassForSlotRegistration
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createQrPassForSlotRegistration = async ({
    createdBy,
    note,
    slotRegistrationId,
}) => {
    const registration = await getSlotRegistrationForQr(slotRegistrationId);

    if (!registration) {
        const error = new Error("Khong tim thay dang ky slot");
        error.statusCode = 404;
        throw error;
    }

    if (registration.status !== "PAID") {
        const error = new Error("Dang ky slot phai PAID moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    if (registration.vehicleStatus !== "APPROVED") {
        const error = new Error("Xe phai duoc duyet moi tao QR pass");
        error.statusCode = 400;
        throw error;
    }

    const qrCode = generateQrCode("SLOT");

    await db.query(
        `INSERT INTO qr_passes
            (
                user_id,
                vehicle_id,
                slot_registration_id,
                qr_code,
                pass_type,
                status,
                valid_from,
                valid_to,
                created_by,
                note
            )
         VALUES (?, ?, ?, ?, 'SLOT_REGISTRATION', 'ACTIVE', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            valid_from = VALUES(valid_from),
            valid_to = VALUES(valid_to),
            created_by = VALUES(created_by),
            note = VALUES(note),
            updated_at = CURRENT_TIMESTAMP`,
        [
            registration.userId || null,
            registration.vehicleId,
            registration.id,
            qrCode,
            buildValidDateTime(registration.startDate),
            buildValidDateTime(registration.endDate, true),
            createdBy || null,
            note || null,
        ]
    );

    return getQrPassBySlotRegistrationId(slotRegistrationId);
};

/**
 * Lấy nghiệp vụ `getQrPassByMonthlyPassId` (get qr pass by monthly pass id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPassByMonthlyPassId
 * @param {*} monthlyPassId - Giá trị `monthlyPassId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassByMonthlyPassId = async (monthlyPassId) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.monthly_pass_id = ?
         LIMIT 1`,
        [monthlyPassId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getQrPassBySlotRegistrationId` (get qr pass by slot registration id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPassBySlotRegistrationId
 * @param {*} slotRegistrationId - Giá trị `slotRegistrationId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassBySlotRegistrationId = async (slotRegistrationId) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.slot_registration_id = ?
         LIMIT 1`,
        [slotRegistrationId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getQrPassById` (get qr pass by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPassById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassById = async (id) => {
    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getQrPasses` (get qr passes). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPasses
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPasses = async ({
    buildingId,
    passType,
    status,
    userId,
    vehicleId,
} = {}) => {
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push("qp.user_id = ?");
        params.push(userId);
    }

    if (vehicleId) {
        conditions.push("qp.vehicle_id = ?");
        params.push(vehicleId);
    }

    if (buildingId) {
        conditions.push("COALESCE(mp.building_id, sr.building_id) = ?");
        params.push(buildingId);
    }

    if (passType) {
        conditions.push("qp.pass_type = ?");
        params.push(passType);
    }

    if (status) {
        conditions.push("qp.status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${qrPassSelect}
         ${whereSql}
         ORDER BY qp.id DESC`,
        params
    );

    return rows;
};

/**
 * Thực hiện nghiệp vụ `ensureQrPassesForUser` (ensure qr passes for user). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function ensureQrPassesForUser
 * @param {*} userId - Giá trị `userId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const ensureQrPassesForUser = async (userId) => {
    const [monthlyRows] = await db.query(
        `SELECT mp.id
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.monthly_pass_id = mp.id
         WHERE mp.user_id = ?
            AND mp.status = 'ACTIVE'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL`,
        [userId]
    );

    for (const row of monthlyRows) {
        await createQrPassForMonthlyPass({
            createdBy: userId,
            monthlyPassId: row.id,
            note: "Auto generated when user opens monthly pass QR page",
        });
    }

    const [slotRows] = await db.query(
        `SELECT sr.id
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.slot_registration_id = sr.id
         WHERE sr.user_id = ?
            AND sr.status = 'PAID'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL`,
        [userId]
    );

    for (const row of slotRows) {
        await createQrPassForSlotRegistration({
            createdBy: userId,
            note: "Auto generated when user opens monthly pass QR page",
            slotRegistrationId: row.id,
        });
    }
};

/**
 * Thực hiện nghiệp vụ `ensureQrPassesForManagement` (ensure qr passes for management). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function ensureQrPassesForManagement
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const ensureQrPassesForManagement = async ({ buildingId, createdBy } = {}) => {
    const monthlyParams = [];
    const monthlyBuildingFilter = buildingId ? "AND mp.building_id = ?" : "";

    if (buildingId) {
        monthlyParams.push(buildingId);
    }

    const [monthlyRows] = await db.query(
        `SELECT mp.id
         FROM monthly_passes mp
         INNER JOIN vehicles v ON mp.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.monthly_pass_id = mp.id
         WHERE mp.status = 'ACTIVE'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL
            ${monthlyBuildingFilter}`,
        monthlyParams
    );

    for (const row of monthlyRows) {
        await createQrPassForMonthlyPass({
            createdBy: createdBy || null,
            monthlyPassId: row.id,
            note: "Auto generated when manager opens monthly pass QR page",
        });
    }

    const slotParams = [];
    const slotBuildingFilter = buildingId ? "AND sr.building_id = ?" : "";

    if (buildingId) {
        slotParams.push(buildingId);
    }

    const [slotRows] = await db.query(
        `SELECT sr.id
         FROM slot_registrations sr
         INNER JOIN vehicles v ON sr.vehicle_id = v.id
         LEFT JOIN qr_passes qp ON qp.slot_registration_id = sr.id
         WHERE sr.status = 'PAID'
            AND v.status = 'APPROVED'
            AND qp.id IS NULL
            ${slotBuildingFilter}`,
        slotParams
    );

    for (const row of slotRows) {
        await createQrPassForSlotRegistration({
            createdBy: createdBy || null,
            note: "Auto generated when manager opens monthly pass QR page",
            slotRegistrationId: row.id,
        });
    }
};

/**
 * Lấy nghiệp vụ `getQrPassByCode` (get qr pass by code). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getQrPassByCode
 * @param {*} qrCode - Giá trị `qrCode` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getQrPassByCode = async (qrCode) => {
    const rawCode = String(qrCode || "").trim();

    const [rows] = await db.query(
        `${qrPassSelect}
         WHERE qp.qr_code = ?
         LIMIT 1`,
        [rawCode]
    );

    if (rows[0]) {
        return rows[0];
    }

    const plateCode = normalizePlateCode(rawCode);

    if (!plateCode) {
        return null;
    }

    const [plateRows] = await db.query(
        `${qrPassSelect}
         WHERE REPLACE(REPLACE(REPLACE(UPPER(v.plate_number), '-', ''), '.', ''), ' ', '') = ?
         ORDER BY
            CASE qp.status WHEN 'ACTIVE' THEN 0 ELSE 1 END,
            qp.valid_to DESC,
            qp.id DESC
         LIMIT 1`,
        [plateCode]
    );

    return plateRows[0] || null;
};

/**
 * Kiểm tra nghiệp vụ `validateQrPass` (validate qr pass). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function validateQrPass
 * @param {*} qrCode - Giá trị `qrCode` được hàm sử dụng trong quá trình xử lý.
 * @param {*} options2 - Giá trị `options2` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const validateQrPass = async (qrCode, { buildingId } = {}) => {
    const qrPass = await getQrPassByCode(qrCode);

    if (!qrPass) {
        return {
            isValid: false,
            reason: "QR_NOT_FOUND",
            message: "Không tìm thấy mã QR.",
        };
    }

    const now = new Date();
    const validFrom = new Date(qrPass.validFrom);
    const validTo = new Date(qrPass.validTo);

    if (
        buildingId &&
        qrPass.buildingId &&
        Number(qrPass.buildingId) !== Number(buildingId)
    ) {
        return {
            isValid: false,
            reason: "QR_BUILDING_MISMATCH",
            message: "Mã QR này thuộc tòa nhà khác.",
            qrPass,
        };
    }

    if (qrPass.vehicleStatus !== "APPROVED") {
            return {
                isValid: false,
                reason: "VEHICLE_NOT_APPROVED",
                message: "Xe chưa được duyệt.",
                qrPass,
            };
    }

    if (qrPass.status !== "ACTIVE") {
            return {
                isValid: false,
                reason: "QR_NOT_ACTIVE",
                message: "Mã QR chưa sẵn sàng sử dụng.",
                qrPass,
            };
    }

    if (qrPass.passType === "MONTHLY") {
        const monthlyPass = await getMonthlyPassForQr(qrPass.monthlyPassId);

        if (!monthlyPass || monthlyPass.status !== "ACTIVE") {
                return {
                    isValid: false,
                    reason: "MONTHLY_PASS_NOT_ACTIVE",
                    message: "Gói tháng gắn với mã QR không còn hiệu lực.",
                    qrPass,
                };
        }
    }

    if (qrPass.passType === "SLOT_REGISTRATION") {
        const registration = await getSlotRegistrationForQr(qrPass.slotRegistrationId);

        if (!registration || registration.status !== "PAID") {
            return {
                isValid: false,
                reason: "SLOT_REGISTRATION_NOT_PAID",
                message: "Gói ô tô gắn với mã QR chưa thanh toán hoặc không còn hiệu lực.",
                qrPass,
            };
        }
    }

    if (now < validFrom || now > validTo) {
        return {
            isValid: false,
            reason: "QR_EXPIRED_OR_NOT_STARTED",
            message: "Mã QR hết hạn hoặc chưa đến ngày hiệu lực.",
            qrPass,
        };
    }

    return {
        isValid: true,
        reason: "VALID",
        message: "Mã QR hợp lệ.",
        qrPass,
    };
};

/**
 * Cập nhật nghiệp vụ `updateQrPassStatus` (update qr pass status). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateQrPassStatus
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateQrPassStatus = async ({ id, note, status }) => {
    await db.query(
        `UPDATE qr_passes
         SET status = ?,
             note = COALESCE(?, note),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, note || null, id]
    );

    return getQrPassById(id);
};

module.exports = {
    createQrPassForMonthlyPass,
    createQrPassForSlotRegistration,
    ensureQrPassesForManagement,
    ensureQrPassesForUser,
    generateQrCode,
    getMonthlyPassForQr,
    getQrPassByCode,
    getQrPassById,
    getQrPassByMonthlyPassId,
    getQrPassBySlotRegistrationId,
    getQrPasses,
    getSlotRegistrationForQr,
    updateQrPassStatus,
    validateQrPass,
};
