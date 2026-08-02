/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền floor.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/floor.service.js.
 */
const db = require("../config/db");

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeSlotRows` (normalize slot rows). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function normalizeSlotRows
 * @param {*} rows - Giá trị `rows` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeSlotRows = (rows) => {
    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    return rows.map((slot) => ({
        id: slot.id,
        code: slot.code,
        slotCode: slot.code,
        status: slot.status,
        type: slot.type,
        sizeLabel: slot.type,
        location: slot.location,
        positionDescription: slot.location,
        note: slot.note,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
    }));
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `mapFloorRow` (map floor row). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function mapFloorRow
 * @param {*} row - Giá trị `row` được hàm sử dụng trong quá trình xử lý.
 * @param {*} slots - Giá trị `slots` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const mapFloorRow = (row, slots = []) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        buildingId: row.buildingId,
        buildingName: row.buildingName,
        name: row.name,
        code: row.code || `FLOOR-${row.id}`,
        floorType: row.floorType,
        capacity: row.capacity,
        currentCount: row.currentCount || 0,
        slotCount: row.slotCount || 0,
        availableSlotCount: row.availableSlotCount || 0,
        reservedSlotCount: row.reservedSlotCount || 0,
        occupiedSlotCount: row.occupiedSlotCount || 0,
        status: row.status,
        note: row.note || row.operationNote,
        operationNote: row.operationNote || row.note,
        slots,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
};

/**
 * Lấy nghiệp vụ `getBuildingById` (get building by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getBuildingById
 * @param {*} buildingId - Giá trị `buildingId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingById = async (buildingId) => {
    const [rows] = await db.query(
        `SELECT id, name, address
         FROM buildings
         WHERE id = ?
         LIMIT 1`,
        [buildingId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `findFloorByNameAndBuilding` (find floor by name and building). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findFloorByNameAndBuilding
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const findFloorByNameAndBuilding = async ({ name, buildingId }) => {
    const [rows] = await db.query(
        `SELECT id, name, building_id AS buildingId
         FROM parking_floors
         WHERE name = ? AND building_id = ?
         LIMIT 1`,
        [name, buildingId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `findFloorByNameAndBuildingExceptId` (find floor by name and building except id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findFloorByNameAndBuildingExceptId
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const findFloorByNameAndBuildingExceptId = async ({ name, buildingId, id }) => {
    const [rows] = await db.query(
        `SELECT id, name, building_id AS buildingId
         FROM parking_floors
         WHERE name = ? AND building_id = ? AND id <> ?
         LIMIT 1`,
        [name, buildingId, id]
    );

    return rows[0] || null;
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
        `SELECT
            id,
            slot_code AS code,
            status,
            size_label AS type,
            position_description AS location,
            note,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM parking_slots
         WHERE floor_id = ?
         ORDER BY id ASC`,
        [floorId]
    );

    return normalizeSlotRows(rows);
};

/**
 * Tạo nghiệp vụ `createSlotsForCarFloor` (create slots for car floor). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createSlotsForCarFloor
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createSlotsForCarFloor = async ({ connection, buildingId, floorId, slotCodes }) => {
    if (!slotCodes || slotCodes.length === 0) {
        return;
    }

    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const values = slotCodes.map((slotCode) => [
        buildingId,
        floorId,
        slotCode,
        "AVAILABLE",
        "STANDARD",
        null,
        null,
    ]);

    await connection.query(
        `INSERT INTO parking_slots
            (building_id, floor_id, slot_code, status, size_label, position_description, note)
         VALUES ?`,
        [values]
    );
};

/**
 * Tạo nghiệp vụ `createFloor` (create floor). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function createFloor
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createFloor = async ({
    buildingId,
    name,
    floorType,
    capacity,
    slotCount,
    slots,
    status,
    operationNote,
    note,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO parking_floors
                (building_id, name, floor_type, capacity, status, note, slot_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                buildingId,
                name,
                floorType,
                capacity || null,
                status || "ACTIVE",
                operationNote || note || null,
                slotCount || 0,
            ]
        );

        const floorId = result.insertId;

        if (floorType === "CAR") {
            await createSlotsForCarFloor({
                connection,
                buildingId,
                floorId,
                slotCodes: slots,
            });
        }

        await connection.commit();
        return getFloorById(floorId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Tạo nghiệp vụ `buildFloorFilters` (build floor filters). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildFloorFilters
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildFloorFilters = ({ q, floorType, status, buildingId }) => {
    const conditions = [];
    const params = [];

    if (q) {
        conditions.push(`pf.name LIKE ?`);
        params.push(`%${q}%`);
    }

    if (buildingId) {
        conditions.push(`pf.building_id = ?`);
        params.push(buildingId);
    }

    if (floorType) {
        conditions.push(`pf.floor_type = ?`);
        params.push(floorType);
    }

    if (status) {
        conditions.push(`pf.status = ?`);
        params.push(status);
    }

    return {
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
    };
};

/**
 * Lấy nghiệp vụ `getFloors` (get floors). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getFloors
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getFloors = async ({ q, floorType, status, buildingId, page = 1, limit = 20 }) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const { whereSql, params } = buildFloorFilters({ q, floorType, status, buildingId });

    const [rows] = await db.query(
        `SELECT
            pf.id,
            pf.building_id AS buildingId,
            b.name AS buildingName,
            pf.name,
            CONCAT('FLOOR-', pf.id) AS code,
            pf.floor_type AS floorType,
            pf.capacity,
            pf.current_count AS currentCount,
            pf.slot_count AS slotCount,
            pf.status,
            pf.note AS operationNote,
            pf.created_at AS createdAt,
            pf.updated_at AS updatedAt
         FROM parking_floors pf
         LEFT JOIN buildings b ON pf.building_id = b.id
         ${whereSql}
         ORDER BY pf.id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
    );

    const [countRows] = await db.query(
        `SELECT COUNT(*) AS total
         FROM parking_floors pf
         ${whereSql}`,
        params
    );

    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const floorIds = rows.map((floor) => floor.id);
    let slotsByFloorId = {};

    if (floorIds.length > 0) {
        const [slotRows] = await db.query(
            `SELECT
                id,
                floor_id AS floorId,
                slot_code AS code,
                status,
                size_label AS type,
                position_description AS location,
                note,
                created_at AS createdAt,
                updated_at AS updatedAt
             FROM parking_slots
             WHERE floor_id IN (?)
             ORDER BY id ASC`,
            [floorIds]
        );

        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        slotsByFloorId = slotRows.reduce((acc, slot) => {
            if (!acc[slot.floorId]) {
                acc[slot.floorId] = [];
            }

            acc[slot.floorId].push({
                id: slot.id,
                code: slot.code,
                slotCode: slot.code,
                status: slot.status,
                type: slot.type,
                sizeLabel: slot.type,
                location: slot.location,
                positionDescription: slot.location,
                note: slot.note,
                createdAt: slot.createdAt,
                updatedAt: slot.updatedAt,
            });

            return acc;
        }, {});
    }

    return {
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        floors: rows.map((row) => mapFloorRow(row, slotsByFloorId[row.id] || [])),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: countRows[0].total,
            totalPages: Math.ceil(countRows[0].total / safeLimit),
        },
    };
};

/**
 * Lấy nghiệp vụ `getFloorsByBuildingId` (get floors by building id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getFloorsByBuildingId
 * @param {*} buildingId - Giá trị `buildingId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getFloorsByBuildingId = async (buildingId) => {
    const result = await getFloors({ buildingId, page: 1, limit: 100 });
    return result.floors;
};

/**
 * Lấy nghiệp vụ `getFloorById` (get floor by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getFloorById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getFloorById = async (id) => {
    const [rows] = await db.query(
        `SELECT
            pf.id,
            pf.building_id AS buildingId,
            b.name AS buildingName,
            pf.name,
            CONCAT('FLOOR-', pf.id) AS code,
            pf.floor_type AS floorType,
            pf.capacity,
            pf.current_count AS currentCount,
            pf.slot_count AS slotCount,
            pf.status,
            pf.note AS operationNote,
            pf.created_at AS createdAt,
            pf.updated_at AS updatedAt
         FROM parking_floors pf
         LEFT JOIN buildings b ON pf.building_id = b.id
         WHERE pf.id = ?
         LIMIT 1`,
        [id]
    );

    if (!rows[0]) {
        return null;
    }

    const slots = await getSlotsByFloorId(id);

    return mapFloorRow(rows[0], slots);
};

/**
 * Cập nhật nghiệp vụ `updateFloor` (update floor). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateFloor
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @param {*} payload - Dữ liệu nghiệp vụ được truyền vào hàm.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateFloor = async (id, payload) => {
    const fields = [];
    const params = [];

    if (payload.buildingId !== undefined) {
        fields.push("building_id = ?");
        params.push(payload.buildingId);
    }

    if (payload.name !== undefined) {
        fields.push("name = ?");
        params.push(payload.name);
    }

    if (payload.floorType !== undefined) {
        fields.push("floor_type = ?");
        params.push(payload.floorType);
    }

    if (payload.capacity !== undefined) {
        fields.push("capacity = ?");
        params.push(payload.capacity);
    }

    if (payload.status !== undefined) {
        fields.push("status = ?");
        params.push(payload.status);
    }

    if (payload.note !== undefined) {
        fields.push("note = ?");
        params.push(payload.note || null);
    }

    if (payload.note !== undefined) {
        fields.push("note = ?");
        params.push(payload.note || null);
    }

    /**
     * Không update slot_count ở đây.
     * slot_count chỉ thay đổi khi thêm/xóa slot bằng slot service.
     */

    if (fields.length === 0) {
        return getFloorById(id);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    await db.query(
        `UPDATE parking_floors
         SET ${fields.join(", ")}
         WHERE id = ?`,
        params
    );

    return getFloorById(id);
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteFloor` (delete floor). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng. Các thay đổi liên quan được bọc trong giao dịch để giữ dữ liệu nhất quán.
 *
 * @function deleteFloor
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deleteFloor = async (id) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [usedSlots] = await connection.query(
            `SELECT COUNT(*) AS total
             FROM parking_slots
             WHERE floor_id = ? AND status <> 'AVAILABLE'`,
            [id]
        );

        if (usedSlots[0].total > 0) {
            const error = new Error("Không thể xóa tầng vì có slot đang được sử dụng hoặc đã được giữ chỗ");
            error.statusCode = 400;
            throw error;
        }

        await connection.query(
            `DELETE FROM parking_slots
             WHERE floor_id = ?`,
            [id]
        );

        const [result] = await connection.query(
            `DELETE FROM parking_floors
             WHERE id = ?`,
            [id]
        );

        await connection.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Tính toán nghiệp vụ `countSlotsByFloorId` (count slots by floor id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function countSlotsByFloorId
 * @param {*} floorId - Giá trị `floorId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const countSlotsByFloorId = async (floorId) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS slotCount
         FROM parking_slots
         WHERE floor_id = ?`,
        [floorId]
    );

    return rows[0].slotCount;
};

module.exports = {
    getBuildingById,
    findFloorByNameAndBuilding,
    findFloorByNameAndBuildingExceptId,
    createFloor,
    getFloors,
    getFloorsByBuildingId,
    getFloorById,
    updateFloor,
    deleteFloor,
    countSlotsByFloorId,
};
