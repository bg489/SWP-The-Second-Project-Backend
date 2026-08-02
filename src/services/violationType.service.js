/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền violationType.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/violationType.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `violationTypeSelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/violationType.service.js.
 */
const violationTypeSelect = `
    SELECT
        vt.id,
        vt.code,
        vt.name,
        vt.default_penalty_fee AS defaultPenaltyFee,
        vt.status,
        vt.description,
        vt.created_by AS createdBy,
        u.name AS createdByName,
        vt.created_at AS createdAt,
        vt.updated_at AS updatedAt
    FROM violation_types vt
    LEFT JOIN users u ON vt.created_by = u.id
`;

/**
 * Tạo nghiệp vụ `createViolationType` (create violation type). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createViolationType
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createViolationType = async ({
    createdBy,
    defaultPenaltyFee,
    description,
    name,
    status,
}) => {
    const [result] = await db.query(
        `INSERT INTO violation_types
            (name, default_penalty_fee, status, description, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
            name,
            defaultPenaltyFee,
            status || "ACTIVE",
            description || null,
            createdBy || null,
        ]
    );

    return getViolationTypeById(result.insertId);
};

/**
 * Lấy nghiệp vụ `getViolationTypes` (get violation types). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getViolationTypes
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationTypes = async ({ q, status } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("vt.status = ?");
        params.push(status);
    }

    if (q) {
        conditions.push("vt.name LIKE ?");
        params.push(`%${q}%`);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${violationTypeSelect}
         ${whereSql}
         ORDER BY (vt.code IS NULL) ASC, vt.status ASC, vt.name ASC, vt.id DESC`,
        params
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getViolationTypeById` (get violation type by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getViolationTypeById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getViolationTypeById = async (id) => {
    const [rows] = await db.query(
        `${violationTypeSelect}
         WHERE vt.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updateViolationType` (update violation type). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateViolationType
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateViolationType = async ({
    defaultPenaltyFee,
    description,
    id,
    name,
    status,
}) => {
    await db.query(
        `UPDATE violation_types
         SET name = ?,
             default_penalty_fee = ?,
             status = ?,
             description = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, defaultPenaltyFee, status, description || null, id]
    );

    return getViolationTypeById(id);
};

/**
 * Thực hiện nghiệp vụ `deactivateViolationType` (deactivate violation type). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function deactivateViolationType
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deactivateViolationType = async (id) => {
    await db.query(
        `UPDATE violation_types
         SET status = 'INACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );

    return getViolationTypeById(id);
};

module.exports = {
    createViolationType,
    deactivateViolationType,
    getViolationTypeById,
    getViolationTypes,
    updateViolationType,
};
