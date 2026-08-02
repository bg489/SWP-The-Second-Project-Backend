/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền vehicle.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/vehicle.service.js.
 */
const db = require("../config/db");

/**
 * Tạo nghiệp vụ `createVehicle` (create vehicle). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createVehicle
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createVehicle = async ({
    userId,
    buildingId,
    plateNumber,
    vehicleType,
    brand,
    color,
    plateImageUrl,
    vehiclePortraitImageUrl,
    vehicleLandscapeImageUrl,
}) => {
    const [result] = await db.query(
        `INSERT INTO vehicles 
            (user_id, building_id, plate_number, vehicle_type, brand, color,
             plate_image_url, vehicle_portrait_image_url, vehicle_landscape_image_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            userId,
            buildingId || null,
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
            plateImageUrl || null,
            vehiclePortraitImageUrl || null,
            vehicleLandscapeImageUrl || null,
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
        vehiclePortraitImageUrl: vehiclePortraitImageUrl || null,
        vehicleLandscapeImageUrl: vehicleLandscapeImageUrl || null,
        status: "PENDING",
    };
};

/**
 * Lấy nghiệp vụ `getVehiclesByUserId` (get vehicles by user id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getVehiclesByUserId
 * @param {*} userId - Giá trị `userId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getVehiclesByUserId = async (userId) => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.brand,
            v.color,
            v.plate_image_url AS plateImageUrl,
            v.vehicle_portrait_image_url AS vehiclePortraitImageUrl,
            v.vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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

/**
 * Lấy nghiệp vụ `getAllVehicles` (get all vehicles). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getAllVehicles
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAllVehicles = async () => {
    const [rows] = await db.query(
        `SELECT
            v.id,
            v.plate_number AS plateNumber,
            v.vehicle_type AS vehicleType,
            v.brand,
            v.color,
            v.plate_image_url AS plateImageUrl,
            v.vehicle_portrait_image_url AS vehiclePortraitImageUrl,
            v.vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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

/**
 * Lấy nghiệp vụ `getVehicleById` (get vehicle by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getVehicleById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
            vehicle_portrait_image_url AS vehiclePortraitImageUrl,
            vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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

/**
 * Lấy nghiệp vụ `findVehicleByPlateNumber` (find vehicle by plate number). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findVehicleByPlateNumber
 * @param {*} plateNumber - Giá trị `plateNumber` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateVehicleStatus` (update vehicle status). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateVehicleStatus
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @param {*} status - Giá trị `status` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateVehicleStatus = async (id, status) => {
    await db.query(
        `UPDATE vehicles
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, id]
    );

    return getVehicleById(id);
};

/**
 * Lấy nghiệp vụ `getVehicleByIdAndUserId` (get vehicle by id and user id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getVehicleByIdAndUserId
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @param {*} userId - Giá trị `userId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
            v.vehicle_portrait_image_url AS vehiclePortraitImageUrl,
            v.vehicle_landscape_image_url AS vehicleLandscapeImageUrl,
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

/**
 * Lấy nghiệp vụ `findVehicleByPlateNumberExceptId` (find vehicle by plate number except id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function findVehicleByPlateNumberExceptId
 * @param {*} plateNumber - Giá trị `plateNumber` được hàm sử dụng trong quá trình xử lý.
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateVehicleByIdAndUserId` (update vehicle by id and user id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateVehicleByIdAndUserId
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateVehicleByIdAndUserId = async ({
    id,
    userId,
    plateNumber,
    vehicleType,
    brand,
    color,
    plateImageUrl,
    vehiclePortraitImageUrl,
    vehicleLandscapeImageUrl,
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
            vehicle_portrait_image_url = ?,
            vehicle_landscape_image_url = ?,
            building_id = ?,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
            plateNumber,
            vehicleType,
            brand || null,
            color || null,
            plateImageUrl || null,
            vehiclePortraitImageUrl || null,
            vehicleLandscapeImageUrl || null,
            buildingId || null,
            id,
            userId,
        ]
    );

    return getVehicleByIdAndUserId(id, userId);
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteVehicleByIdAndUserId` (delete vehicle by id and user id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function deleteVehicleByIdAndUserId
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @param {*} userId - Giá trị `userId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
