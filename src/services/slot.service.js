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
