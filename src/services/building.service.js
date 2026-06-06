const db = require("../config/db");

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
        `SELECT
            id,
            name,
            address,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM buildings
         ORDER BY id DESC`
    );

    return rows;
};

const getBuildingById = async (id) => {
    const [rows] = await db.query(
        `SELECT
            id,
            name,
            address,
            created_at AS createdAt,
            updated_at AS updatedAt
         FROM buildings
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

module.exports = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
};