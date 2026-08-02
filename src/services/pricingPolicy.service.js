/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền pricingPolicy.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/pricingPolicy.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `pricingPolicySelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/pricingPolicy.service.js.
 */
const pricingPolicySelect = `
    SELECT
        id,
        building_id AS buildingId,
        (
            SELECT name
            FROM buildings
            WHERE buildings.id = pricing_policies.building_id
            LIMIT 1
        ) AS buildingName,
        vehicle_type AS vehicleType,
        pricing_type AS pricingType,
        amount,
        status,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM pricing_policies
`;

/**
 * Tạo nghiệp vụ `createPricingPolicy` (create pricing policy). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function createPricingPolicy
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createPricingPolicy = async ({
    amount,
    buildingId,
    description,
    pricingType,
    status,
    vehicleType,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if ((status || "ACTIVE") === "ACTIVE") {
            await connection.query(
                `UPDATE pricing_policies
                 SET status = 'INACTIVE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE (building_id <=> ?)
                    AND vehicle_type = ?
                    AND pricing_type = ?
                    AND status = 'ACTIVE'`,
                [buildingId || null, vehicleType, pricingType]
            );
        }

        const [result] = await connection.query(
            `INSERT INTO pricing_policies
                (building_id, vehicle_type, pricing_type, amount, status, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                buildingId || null,
                vehicleType,
                pricingType,
                amount,
                status || "ACTIVE",
                description || null,
            ]
        );

        await connection.commit();

        return getPricingPolicyById(result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Lấy nghiệp vụ `getPricingPolicies` (get pricing policies). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getPricingPolicies
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getPricingPolicies = async ({ buildingId, pricingType, status, vehicleType } = {}) => {
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

    if (pricingType) {
        conditions.push("pricing_type = ?");
        params.push(pricingType);
    }

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${pricingPolicySelect}
         ${whereSql}
         ORDER BY updated_at DESC, created_at DESC, id DESC`,
        params
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getPricingPolicyById` (get pricing policy by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getPricingPolicyById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getPricingPolicyById = async (id) => {
    const [rows] = await db.query(
        `${pricingPolicySelect}
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getActivePricingPolicy` (get active pricing policy). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getActivePricingPolicy
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getActivePricingPolicy = async ({ buildingId, pricingType, vehicleType }) => {
    const conditions = [
        "vehicle_type = ?",
        "pricing_type = ?",
        "status = 'ACTIVE'",
    ];
    const params = [vehicleType, pricingType];

    if (buildingId) {
        conditions.unshift("building_id = ?");
        params.unshift(buildingId);
    }

    const [rows] = await db.query(
        `${pricingPolicySelect}
         WHERE ${conditions.join(" AND ")}
         ORDER BY id DESC
         LIMIT 1`,
        params
    );

    if (rows[0] || !buildingId) {
        return rows[0] || null;
    }

    const [fallbackRows] = await db.query(
        `${pricingPolicySelect}
         WHERE building_id IS NULL
            AND vehicle_type = ?
            AND pricing_type = ?
            AND status = 'ACTIVE'
         ORDER BY id DESC
         LIMIT 1`,
        [vehicleType, pricingType]
    );

    return fallbackRows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updatePricingPolicy` (update pricing policy). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function updatePricingPolicy
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updatePricingPolicy = async ({
    amount,
    buildingId,
    description,
    id,
    pricingType,
    status,
    vehicleType,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if (status === "ACTIVE") {
            await connection.query(
                `UPDATE pricing_policies
                 SET status = 'INACTIVE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE (building_id <=> ?)
                    AND vehicle_type = ?
                    AND pricing_type = ?
                    AND status = 'ACTIVE'
                    AND id <> ?`,
                [buildingId || null, vehicleType, pricingType, id]
            );
        }

        await connection.query(
            `UPDATE pricing_policies
             SET
                building_id = ?,
                vehicle_type = ?,
                pricing_type = ?,
                amount = ?,
                status = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                buildingId || null,
                vehicleType,
                pricingType,
                amount,
                status,
                description || null,
                id,
            ]
        );

        await connection.commit();

        return getPricingPolicyById(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Thực hiện nghiệp vụ `deactivatePricingPolicy` (deactivate pricing policy). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function deactivatePricingPolicy
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deactivatePricingPolicy = async (id) => {
    const [result] = await db.query(
        `UPDATE pricing_policies
         SET status = 'INACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createPricingPolicy,
    deactivatePricingPolicy,
    getActivePricingPolicy,
    getPricingPolicies,
    getPricingPolicyById,
    updatePricingPolicy,
};
