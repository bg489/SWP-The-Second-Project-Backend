/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền building.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/building.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `DEFAULT_TEMP_QR_CARD_QUANTITY` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/building.service.js.
 */
const DEFAULT_TEMP_QR_CARD_QUANTITY = 20;

/**
 * Tạo nghiệp vụ `buildBuildingPrefix` (build building prefix). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildBuildingPrefix
 * @param {*} buildingName - Giá trị `buildingName` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildBuildingPrefix = (buildingName = "") => {
    const normalized = buildingName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim();
    const prefix = normalized
        .split(/\s+/)
        .filter(Boolean)
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    return prefix || "QR";
};

/**
 * Lấy nghiệp vụ `getDefaultTempQrCardQuantity` (get default temp qr card quantity). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getDefaultTempQrCardQuantity
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getDefaultTempQrCardQuantity = () => {
    const configured = Number(process.env.DEFAULT_TEMP_QR_CARD_COUNT);

    return Number.isInteger(configured) && configured >= 1 && configured <= 500
        ? configured
        : DEFAULT_TEMP_QR_CARD_QUANTITY;
};

/**
 * Khai báo `buildingSelectWithCounts` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/building.service.js.
 */
const buildingSelectWithCounts = `
    SELECT
        b.id,
        b.name,
        b.address,
        b.created_at AS createdAt,
        b.updated_at AS updatedAt,
        COUNT(DISTINCT f.id) AS floorCount,
        COUNT(DISTINCT CASE WHEN f.floor_type = 'MOTORBIKE' THEN f.id END) AS motorbikeFloorCount,
        COUNT(DISTINCT CASE WHEN f.floor_type = 'CAR' THEN f.id END) AS carFloorCount,
        COUNT(DISTINCT s.id) AS carSlotCount,
        COUNT(DISTINCT tq.id) AS tempQrCardCount
    FROM buildings b
    LEFT JOIN parking_floors f ON f.building_id = b.id
    LEFT JOIN parking_slots s ON s.floor_id = f.id
    LEFT JOIN temporary_qr_cards tq ON tq.building_id = b.id
`;

/**
 * Tạo nghiệp vụ `createBuilding` (create building). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function createBuilding
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createBuilding = async ({
    address,
    carHourlyPrice,
    carMonthlyPrice,
    motorbikeMonthlyPrice,
    motorbikeTurnPrice,
    name,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO buildings (name, address)
             VALUES (?, ?)`,
            [name, address || null]
        );

        const buildingId = result.insertId;
        const basePrefix = buildBuildingPrefix(name);
        const [prefixRows] = await connection.query(
            `SELECT id
             FROM temporary_qr_cards
             WHERE card_code LIKE ?
             LIMIT 1`,
            [`${basePrefix}-%`]
        );
        const cardPrefix = prefixRows.length > 0
            ? `${basePrefix}${buildingId}`
            : basePrefix;
        const cardQuantity = getDefaultTempQrCardQuantity();
        /* Callback nội bộ của lời gọi `from`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        const cardValues = Array.from({ length: cardQuantity }, (_, index) => [
            buildingId,
            `${cardPrefix}-${String(index + 1).padStart(4, "0")}`,
            "READY",
            "Thẻ QR tạm được tạo tự động cùng tòa nhà",
        ]);
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        const cardPlaceholders = cardValues.map(() => "(?, ?, ?, ?)").join(", ");

        await connection.query(
            `INSERT INTO temporary_qr_cards
                (building_id, card_code, status, note)
             VALUES ${cardPlaceholders}`,
            cardValues.flat()
        );

        if (motorbikeTurnPrice) {
            await connection.query(
                `INSERT INTO pricing_policies
                    (building_id, vehicle_type, pricing_type, amount, status, description)
                 VALUES (?, 'MOTORBIKE', 'TURN', ?, 'ACTIVE', ?)`,
                [buildingId, motorbikeTurnPrice, "Gia xe may theo luot khi tao toa nha"]
            );
        }

        if (carHourlyPrice) {
            await connection.query(
                `INSERT INTO pricing_policies
                    (building_id, vehicle_type, pricing_type, amount, status, description)
                 VALUES (?, 'CAR', 'HOURLY', ?, 'ACTIVE', ?)`,
                [buildingId, carHourlyPrice, "Gia oto theo gio khi tao toa nha"]
            );
        }

        if (motorbikeMonthlyPrice) {
            await connection.query(
                `INSERT INTO package_plans
                    (building_id, name, vehicle_type, price, duration_days, status, description)
                 VALUES (?, ?, 'MOTORBIKE', ?, 30, 'ACTIVE', ?)`,
                [
                    buildingId,
                    `Goi xe may 30 ngay - ${name}`,
                    motorbikeMonthlyPrice,
                    "Goi thang xe may theo toa nha",
                ]
            );
        }

        if (carMonthlyPrice) {
            await connection.query(
                `INSERT INTO package_plans
                    (building_id, name, vehicle_type, price, duration_days, status, description)
                 VALUES (?, ?, 'CAR', ?, 30, 'ACTIVE', ?)`,
                [
                    buildingId,
                    `Goi oto 30 ngay - ${name}`,
                    carMonthlyPrice,
                    "Goi thang oto theo toa nha",
                ]
            );
        }

        await connection.commit();

        return getBuildingById(buildingId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Lấy nghiệp vụ `getAllBuildings` (get all buildings). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getAllBuildings
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAllBuildings = async () => {
    const [rows] = await db.query(
        `${buildingSelectWithCounts}
         GROUP BY b.id, b.name, b.address, b.created_at, b.updated_at
         ORDER BY b.id DESC`
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getBuildingById` (get building by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getBuildingById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingById = async (id) => {
    const [rows] = await db.query(
        `${buildingSelectWithCounts}
         WHERE b.id = ?
         GROUP BY b.id, b.name, b.address, b.created_at, b.updated_at
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updateBuilding` (update building). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateBuilding
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateBuilding = async ({ id, name, address }) => {
    await db.query(
        `UPDATE buildings
         SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, address || null, id]
    );

    return getBuildingById(id);
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteBuilding` (delete building). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function deleteBuilding
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deleteBuilding = async (id) => {
    const [result] = await db.query(
        `DELETE FROM buildings
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
    updateBuilding,
    deleteBuilding,
};
