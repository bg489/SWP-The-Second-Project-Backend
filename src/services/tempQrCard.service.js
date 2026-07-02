const db = require("../config/db");

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

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildBuildingPrefix = (buildingName = "") => {
    const normalized = buildingName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim();
    const prefix = normalized
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    return prefix || "QR";
};

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
    const maxNumber = rows.reduce((max, row) => {
        const match = String(row.cardCode || "").match(matcher);
        if (!match) return max;

        return Math.max(max, Number(match[1]) || 0);
    }, 0);

    return maxNumber + 1;
};

const createTempQrCard = async ({ buildingId, cardCode, note, status }) => {
    const [result] = await db.query(
        `INSERT INTO temporary_qr_cards
            (building_id, card_code, status, note)
         VALUES (?, ?, ?, ?)`,
        [buildingId || null, cardCode, status || "READY", note || null]
    );

    return getTempQrCardById(result.insertId);
};

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

    const prefix = buildBuildingPrefix(building.name);
    const startNumber = await getNextCardStart({ buildingId, prefix });
    const values = Array.from({ length: safeQuantity }, (_, index) => [
        buildingId,
        `${prefix}-${String(startNumber + index).padStart(4, "0")}`,
        status || "READY",
        note || null,
    ]);
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

const getTempQrCardById = async (id) => {
    const [rows] = await db.query(
        `${tempQrCardSelect}
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getTempQrCardByCode = async (cardCode) => {
    const [rows] = await db.query(
        `${tempQrCardSelect}
         WHERE card_code = ?
         LIMIT 1`,
        [cardCode]
    );

    return rows[0] || null;
};

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
