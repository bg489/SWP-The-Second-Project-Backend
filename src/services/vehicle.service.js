const db = require("../config/db");

const createVehicle = async ({
    userId,
    buildingId,
    plateNumber,
    vehicleType,
    brand,
    color,
    plateImageUrl,
}) => {
    const [result] = await db.query(
        `INSERT INTO vehicles 
            (user_id, building_id, plate_number, vehicle_type, brand, color, plate_image_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            userId,
            buildingId || null,
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
            plateImageUrl || null,
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
        plateImageUrl: plateImageUrl || null,
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
            v.plate_image_url AS plateImageUrl,
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
            v.plate_image_url AS plateImageUrl,
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
        `SELECT
            id,
            user_id AS userId,
            building_id AS buildingId,
            plate_number AS plateNumber,
            vehicle_type AS vehicleType,
            brand,
            color,
            plate_image_url AS plateImageUrl,
            status,
            created_at AS createdAt,
            updated_at AS updatedAt
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

const getVehicleByIdAndUserId = async (id, userId) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.user_id AS userId,
            v.building_id AS buildingId,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.brand,
            v.color,
            v.plate_image_url AS plateImageUrl,
            v.status,
            v.created_at AS createdAt,
            v.updated_at AS updatedAt,

            b.name AS buildingName,
            b.address AS buildingAddress
         FROM vehicles v
         LEFT JOIN buildings b ON v.building_id = b.id
         WHERE v.id = ? AND v.user_id = ?
         LIMIT 1`,
        [id, userId]
    );

    return rows[0] || null;
};

const findVehicleByPlateNumberExceptId = async (plateNumber, id) => {
    const [rows] = await db.query(
        `SELECT *
         FROM vehicles
         WHERE plate_number = ? AND id <> ?
         LIMIT 1`,
        [plateNumber, id]
    );

    return rows[0] || null;
};

const updateVehicleByIdAndUserId = async ({
    id,
    userId,
    plateNumber,
    vehicleType,
    brand,
    color,
    plateImageUrl,
    buildingId,
}) => {
    await db.query(
        `UPDATE vehicles
         SET
            plate_number = ?,
            vehicle_type = ?,
            brand = ?,
            color = ?,
            plate_image_url = ?,
            building_id = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
            plateImageUrl || null,
            buildingId || null,
            id,
            userId,
        ]
    );

    return getVehicleByIdAndUserId(id, userId);
};

const deleteVehicleByIdAndUserId = async (id, userId) => {
    const [result] = await db.query(
        `DELETE FROM vehicles
         WHERE id = ? AND user_id = ?`,
        [id, userId]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createVehicle,
    getVehiclesByUserId,
    getAllVehicles,
    getVehicleById,
    getVehicleByIdAndUserId,
    findVehicleByPlateNumber,
    findVehicleByPlateNumberExceptId,
    updateVehicleStatus,
    updateVehicleByIdAndUserId,
    deleteVehicleByIdAndUserId,
};
