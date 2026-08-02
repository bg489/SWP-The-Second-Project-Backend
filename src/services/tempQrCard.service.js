/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền tempQrCard.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/tempQrCard.service.js.
 */
const db = require("../config/db");

/**
 * Khai báo `tempQrCardSelect` để định nghĩa câu truy vấn SQL nền và ánh xạ các cột dữ liệu cho những thao tác bên dưới.
 * Phạm vi sử dụng: src/services/tempQrCard.service.js.
 */
const tempQrCardSelect = `
    SELECT
        id,
        building_id AS buildingId,
        (
            SELECT name
            FROM buildings
            WHERE buildings.id = temporary_qr_cards.building_id
            LIMIT 1
        ) AS buildingName,
        card_code AS cardCode,
        status,
        current_session_id AS currentSessionId,
        issued_at AS issuedAt,
        returned_at AS returnedAt,
        note,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM temporary_qr_cards
`;

/**
 * Thực hiện nghiệp vụ `escapeRegExp` (escape reg exp). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function escapeRegExp
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tạo nghiệp vụ `buildBuildingPrefix` (build building prefix). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildBuildingPrefix
 * @param {*} buildingName - Giá trị `buildingName` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildBuildingPrefix = (buildingName = "") => {
    const normalized = buildingName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim();
    const prefix = normalized
        .split(/\s+/)
        .filter(Boolean)
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    return prefix || "QR";
};

/**
 * Lấy nghiệp vụ `getBuildingById` (get building by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getBuildingById
 * @param {*} buildingId - Giá trị `buildingId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingById = async (buildingId) => {
    const [rows] = await db.query(
        `SELECT id, name
         FROM buildings
         WHERE id = ?
         LIMIT 1`,
        [buildingId]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getBuildingPrefix` (get building prefix). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getBuildingPrefix
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingPrefix = async ({ buildingId, buildingName }) => {
    const [buildingCardRows] = await db.query(
        `SELECT card_code AS cardCode
         FROM temporary_qr_cards
         WHERE building_id = ?
         ORDER BY id ASC`,
        [buildingId]
    );
    const existingPrefix = buildingCardRows
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((row) => String(row.cardCode || "").match(/^([A-Z0-9]+)-\d+$/)?.[1])
        .find(Boolean);

    if (existingPrefix) {
        return existingPrefix;
    }

    const basePrefix = buildBuildingPrefix(buildingName);
    const [collisionRows] = await db.query(
        `SELECT id
         FROM temporary_qr_cards
         WHERE building_id <> ?
            AND card_code LIKE ?
         LIMIT 1`,
        [buildingId, `${basePrefix}-%`]
    );

    return collisionRows.length > 0 ? `${basePrefix}${buildingId}` : basePrefix;
};

/**
 * Lấy nghiệp vụ `getNextCardStart` (get next card start). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getNextCardStart
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getNextCardStart = async ({ buildingId, prefix }) => {
    const [rows] = await db.query(
        `SELECT card_code AS cardCode
         FROM temporary_qr_cards
         WHERE building_id = ?
            AND card_code LIKE ?
         ORDER BY id DESC`,
        [buildingId, `${prefix}-%`]
    );

    const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
    /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const maxNumber = rows.reduce((max, row) => {
        const match = String(row.cardCode || "").match(matcher);
        if (!match) return max;

        return Math.max(max, Number(match[1]) || 0);
    }, 0);

    return maxNumber + 1;
};

/**
 * Tạo nghiệp vụ `createTempQrCard` (create temp qr card). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createTempQrCard
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createTempQrCard = async ({ buildingId, cardCode, note, status }) => {
    const [result] = await db.query(
        `INSERT INTO temporary_qr_cards
            (building_id, card_code, status, note)
         VALUES (?, ?, ?, ?)`,
        [buildingId || null, cardCode, status || "READY", note || null]
    );

    return getTempQrCardById(result.insertId);
};

/**
 * Tạo nghiệp vụ `createTempQrCardsBulk` (create temp qr cards bulk). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function createTempQrCardsBulk
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createTempQrCardsBulk = async ({ buildingId, note, quantity, status }) => {
    const safeQuantity = Number(quantity);

    if (!Number.isInteger(safeQuantity) || safeQuantity < 1 || safeQuantity > 500) {
        const error = new Error("quantity phai tu 1 den 500");
        error.statusCode = 400;
        throw error;
    }

    if (!buildingId) {
        const error = new Error("buildingId khong duoc de trong");
        error.statusCode = 400;
        throw error;
    }

    const building = await getBuildingById(buildingId);

    if (!building) {
        const error = new Error("Khong tim thay toa nha");
        error.statusCode = 404;
        throw error;
    }

    const prefix = await getBuildingPrefix({
        buildingId,
        buildingName: building.name,
    });
    const startNumber = await getNextCardStart({ buildingId, prefix });
    /* Callback nội bộ của lời gọi `from`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const values = Array.from({ length: safeQuantity }, (_, index) => [
        buildingId,
        `${prefix}-${String(startNumber + index).padStart(4, "0")}`,
        status || "READY",
        note || null,
    ]);
    /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    const placeholders = values.map(() => "(?, ?, ?, ?)").join(", ");

    const [result] = await db.query(
        `INSERT INTO temporary_qr_cards
            (building_id, card_code, status, note)
         VALUES ${placeholders}`,
        values.flat()
    );

    const [rows] = await db.query(
        `${tempQrCardSelect}
         WHERE id BETWEEN ? AND ?
         ORDER BY id ASC`,
        [result.insertId, result.insertId + safeQuantity - 1]
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getTempQrCards` (get temp qr cards). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getTempQrCards
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTempQrCards = async ({ buildingId, status } = {}) => {
    const params = [];
    const conditions = [];

    if (buildingId) {
        conditions.push("building_id = ?");
        params.push(buildingId);
    }

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${tempQrCardSelect}
         ${whereSql}
         ORDER BY id DESC`,
        params
    );

    return rows;
};

/**
 * Lấy nghiệp vụ `getTempQrCardById` (get temp qr card by id). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getTempQrCardById
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTempQrCardById = async (id) => {
    const [rows] = await db.query(
        `${tempQrCardSelect}
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Lấy nghiệp vụ `getTempQrCardByCode` (get temp qr card by code). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function getTempQrCardByCode
 * @param {*} cardCode - Giá trị `cardCode` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTempQrCardByCode = async (cardCode) => {
    const [rows] = await db.query(
        `${tempQrCardSelect}
         WHERE card_code = ?
         LIMIT 1`,
        [cardCode]
    );

    return rows[0] || null;
};

/**
 * Cập nhật nghiệp vụ `updateTempQrCardStatus` (update temp qr card status). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function updateTempQrCardStatus
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateTempQrCardStatus = async ({ id, note, status }) => {
    const returnedAtSql = status === "READY" || status === "COMPLETED"
        ? "returned_at = CURRENT_TIMESTAMP,"
        : "";
    const currentSessionSql = status === "READY" || status === "COMPLETED"
        ? "current_session_id = NULL,"
        : "";

    await db.query(
        `UPDATE temporary_qr_cards
         SET status = ?,
             ${currentSessionSql}
             ${returnedAtSql}
             note = COALESCE(?, note),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, note || null, id]
    );

    return getTempQrCardById(id);
};

/**
 * Thực hiện nghiệp vụ `markCardInUse` (mark card in use). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function markCardInUse
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const markCardInUse = async ({ cardId, connection, sessionId }) => {
    const executor = connection || db;
    const [result] = await executor.query(
        `UPDATE temporary_qr_cards
         SET status = 'IN_USE',
             current_session_id = ?,
             issued_at = CURRENT_TIMESTAMP,
             returned_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
            AND status = 'READY'`,
        [sessionId, cardId]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Temporary QR card is not ready");
        error.code = "TEMP_QR_NOT_READY";
        throw error;
    }
};

/**
 * Xử lý nghiệp vụ `completeCardSession` (complete card session). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan. Có đọc hoặc ghi cơ sở dữ liệu và trả kết quả đã ánh xạ về tên trường của ứng dụng.
 *
 * @function completeCardSession
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const completeCardSession = async ({ cardId, connection }) => {
    if (!cardId) {
        return;
    }

    const executor = connection || db;
    await executor.query(
        `UPDATE temporary_qr_cards
         SET status = 'COMPLETED',
             current_session_id = NULL,
             returned_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cardId]
    );
};

module.exports = {
    completeCardSession,
    createTempQrCard,
    createTempQrCardsBulk,
    getTempQrCardByCode,
    getTempQrCardById,
    getTempQrCards,
    markCardInUse,
    updateTempQrCardStatus,
};
