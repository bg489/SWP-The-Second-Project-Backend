const db = require("../config/db");

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

const createSlot = async ({
    buildingId,
    floorId,
    slotCode,
    status,
    sizeLabel,
    positionDescription,
    note,
}) => {
    const [result] = await db.query(
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

    return getSlotById(result.insertId);
};

const getSlotsByFloorId = async (floorId) => {
    const [rows] = await db.query(
        `${slotSelect}
         WHERE s.floor_id = ?
         ORDER BY s.id DESC`,
        [floorId]
    );

    return rows;
};

const getSlotById = async (id) => {
    const [rows] = await db.query(
        `${slotSelect}
         WHERE s.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

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

const deleteSlot = async (id) => {
    const [result] = await db.query(
        `DELETE FROM parking_slots
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createSlot,
    getSlotsByFloorId,
    getSlotById,
    updateSlot,
    deleteSlot,
};
