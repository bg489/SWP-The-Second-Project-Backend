const db = require("../config/db");

const createVehicle = async ({
    userId,
    buildingId,
    plateNumber,
    vehicleType,
    brand,
    color,
}) => {
    const [result] = await db.query(
        `INSERT INTO vehicles 
            (user_id, building_id, plate_number, vehicle_type, brand, color, status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            userId,
            buildingId || null,
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
        ]
    );

    return {
        id: result.insertId,
        userId,
        buildingId: buildingId || null,
        plateNumber,
        vehicleType,
        brand: brand || null,
        color: color || null,
        status: "PENDING",
    };
};

const getVehiclesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.brand,
            v.color,
            v.status,
            v.created_at AS createdAt,
            b.id AS buildingId,
            b.name AS buildingName
         FROM vehicles v
         LEFT JOIN buildings b ON v.building_id = b.id
         WHERE v.user_id = ?
         ORDER BY v.id DESC`,
        [userId]
    );

    return rows;
};

const getAllVehicles = async () => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.brand,
            v.color,
            v.status,
            v.created_at AS createdAt,

            u.id AS userId,
            u.name AS ownerName,
            u.email AS ownerEmail,
            u.phone AS ownerPhone,

            b.id AS buildingId,
            b.name AS buildingName
         FROM vehicles v
         INNER JOIN users u ON v.user_id = u.id
         LEFT JOIN buildings b ON v.building_id = b.id
         ORDER BY v.id DESC`
    );

    return rows;
};

const getVehicleById = async (id) => {
    const [rows] = await db.query(
        `SELECT *
         FROM vehicles
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const findVehicleByPlateNumber = async (plateNumber) => {
    const [rows] = await db.query(
        `SELECT *
         FROM vehicles
         WHERE plate_number = ?
         LIMIT 1`,
        [plateNumber]
    );

    return rows[0] || null;
};

const updateVehicleStatus = async (id, status) => {
    await db.query(
        `UPDATE vehicles
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, id]
    );

    return getVehicleById(id);
};

module.exports = {
    createVehicle,
    getVehiclesByUserId,
    getAllVehicles,
    getVehicleById,
    findVehicleByPlateNumber,
    updateVehicleStatus,
};