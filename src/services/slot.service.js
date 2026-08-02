/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền slot.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/slot.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `slotSelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/slot.service.js.
 */
const slotSelect = `
    SELECT
        s.id,
        s.building_id AS buildingId,
        b.name AS buildingName,
        s.floor_id AS floorId,
        f.name AS floorName,
        f.floor_type AS floorType,
        s.slot_code AS slotCode,
        s.status,
        s.size_label AS sizeLabel,
        s.position_description AS positionDescription,
        s.note,
        s.created_at AS createdAt,
        s.updated_at AS updatedAt
    FROM parking_slots s
    INNER JOIN buildings b ON s.building_id = b.id
    INNER JOIN parking_floors f ON s.floor_id = f.id
`;

/**
 * Tạo nghiệp vụ `createSlot` (create slot). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function createSlot
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createSlot = async ({
    buildingId,
    floorId,
    slotCode,
    status,
    sizeLabel,
    positionDescription,
    note,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO parking_slots
                (building_id, floor_id, slot_code, status, size_label, position_description, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                buildingId,
                floorId,
                slotCode,
                status || "AVAILABLE",
                sizeLabel || null,
                positionDescription || null,
                note || null,
            ]
        );

        await connection.query(
            `UPDATE parking_floors
             SET slot_count = slot_count + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND floor_type = 'CAR'`,
            [floorId]
        );

        await connection.commit();

        return getSlotById(result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Lấy nghiệp vụ `getSlotsByFloorId` (get slots by floor id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getSlotsByFloorId
 * @param {*} floorId - Giá trị `floorId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getSlotsByFloorId = async (floorId) => {
    const [rows] = await db.query(
        `${slotSelect}
         WHERE s.floor_id = ?
         ORDER BY s.id DESC`,
        [floorId]
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getSlotById` (get slot by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getSlotById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getSlotById = async (id) => {
    const [rows] = await db.query(
        `${slotSelect}
         WHERE s.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updateSlot` (update slot). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateSlot
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateSlot = async ({
    id,
    slotCode,
    status,
    sizeLabel,
    positionDescription,
    note,
}) => {
    await db.query(
        `UPDATE parking_slots
         SET
            slot_code = ?,
            status = ?,
            size_label = ?,
            position_description = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
            slotCode,
            status,
            sizeLabel || null,
            positionDescription || null,
            note || null,
            id,
        ]
    );

    return getSlotById(id);
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteSlot` (delete slot). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function deleteSlot
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deleteSlot = async (id) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [slotRows] = await connection.query(
            `SELECT id, floor_id AS floorId, status
             FROM parking_slots
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [id]
        );

        const slot = slotRows[0];

        if (!slot) {
            await connection.rollback();
            return false;
        }

        const [result] = await connection.query(
            `DELETE FROM parking_slots
             WHERE id = ?`,
            [id]
        );

        if (result.affectedRows > 0) {
            await connection.query(
                `UPDATE parking_floors
                 SET slot_count = GREATEST(slot_count - 1, 0),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND floor_type = 'CAR'`,
                [slot.floorId]
            );
        }

        await connection.commit();

        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createSlot,
    getSlotsByFloorId,
    getSlotById,
    updateSlot,
    deleteSlot,
};
