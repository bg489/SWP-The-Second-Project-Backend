const db = require("../config/db");

const normalizeSlotRows = (rows) => {
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

const createSlotsForCarFloor = async ({ connection, buildingId, floorId, slotCodes }) => {
    if (!slotCodes || slotCodes.length === 0) {
        return;
    }

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
        floors: rows.map((row) => mapFloorRow(row, slotsByFloorId[row.id] || [])),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: countRows[0].total,
            totalPages: Math.ceil(countRows[0].total / safeLimit),
        },
    };
};

const getFloorsByBuildingId = async (buildingId) => {
    const result = await getFloors({ buildingId, page: 1, limit: 100 });
    return result.floors;
};

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
