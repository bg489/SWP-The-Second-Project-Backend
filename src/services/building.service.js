const db = require("../config/db");

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
        COUNT(DISTINCT s.id) AS carSlotCount
    FROM buildings b
    LEFT JOIN parking_floors f ON f.building_id = b.id
    LEFT JOIN parking_slots s ON s.floor_id = f.id
`;

const createBuilding = async ({ name, address }) => {
    const [result] = await db.query(
        `INSERT INTO buildings (name, address)
         VALUES (?, ?)`,
        [name, address || null]
    );

    return {
        id: result.insertId,
        name,
        address: address || null,
    };
};

const getAllBuildings = async () => {
    const [rows] = await db.query(
        `${buildingSelectWithCounts}
         GROUP BY b.id, b.name, b.address, b.created_at, b.updated_at
         ORDER BY b.id DESC`
    );

    return rows;
};

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

const updateBuilding = async ({ id, name, address }) => {
    await db.query(
        `UPDATE buildings
         SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, address || null, id]
    );

    return getBuildingById(id);
};

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
