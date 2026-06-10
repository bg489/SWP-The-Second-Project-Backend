const db = require("../config/db");

const floorSelectWithCounts = `
    SELECT
        f.id,
        f.building_id AS buildingId,
        b.name AS buildingName,
        f.name,
        f.floor_type AS floorType,
        f.capacity,
        f.status,
        f.note,
        f.created_at AS createdAt,
        f.updated_at AS updatedAt,
        COUNT(DISTINCT s.id) AS slotCount,
        COUNT(DISTINCT CASE WHEN s.status = 'AVAILABLE' THEN s.id END) AS availableSlotCount,
        COUNT(DISTINCT CASE WHEN s.status = 'RESERVED' THEN s.id END) AS reservedSlotCount,
        COUNT(DISTINCT CASE WHEN s.status = 'OCCUPIED' THEN s.id END) AS occupiedSlotCount
    FROM parking_floors f
    INNER JOIN buildings b ON f.building_id = b.id
    LEFT JOIN parking_slots s ON s.floor_id = f.id
`;

const createFloor = async ({
    buildingId,
    name,
    floorType,
    capacity,
    status,
    note,
}) => {
    const [result] = await db.query(
        `INSERT INTO parking_floors
            (building_id, name, floor_type, capacity, status, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            buildingId,
            name,
            floorType,
            capacity || null,
            status || "ACTIVE",
            note || null,
        ]
    );

    return getFloorById(result.insertId);
};

const getFloorsByBuildingId = async (buildingId) => {
    const [rows] = await db.query(
        `${floorSelectWithCounts}
         WHERE f.building_id = ?
         GROUP BY
            f.id,
            f.building_id,
            b.name,
            f.name,
            f.floor_type,
            f.capacity,
            f.status,
            f.note,
            f.created_at,
            f.updated_at
         ORDER BY f.id DESC`,
        [buildingId]
    );

    return rows;
};

const getFloorById = async (id) => {
    const [rows] = await db.query(
        `${floorSelectWithCounts}
         WHERE f.id = ?
         GROUP BY
            f.id,
            f.building_id,
            b.name,
            f.name,
            f.floor_type,
            f.capacity,
            f.status,
            f.note,
            f.created_at,
            f.updated_at
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const updateFloor = async ({
    id,
    name,
    floorType,
    capacity,
    status,
    note,
}) => {
    await db.query(
        `UPDATE parking_floors
         SET
            name = ?,
            floor_type = ?,
            capacity = ?,
            status = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, floorType, capacity || null, status, note || null, id]
    );

    return getFloorById(id);
};

const deleteFloor = async (id) => {
    const [result] = await db.query(
        `DELETE FROM parking_floors
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
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
    createFloor,
    getFloorsByBuildingId,
    getFloorById,
    updateFloor,
    deleteFloor,
    countSlotsByFloorId,
};
