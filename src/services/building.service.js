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
