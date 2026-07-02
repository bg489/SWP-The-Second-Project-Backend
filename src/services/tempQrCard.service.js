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

const createTempQrCard = async ({ buildingId, cardCode, note, status }) => {
    const [result] = await db.query(
        `INSERT INTO temporary_qr_cards
            (building_id, card_code, status, note)
         VALUES (?, ?, ?, ?)`,
        [buildingId || null, cardCode, status || "READY", note || null]
    );

    return getTempQrCardById(result.insertId);
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
    getTempQrCardByCode,
    getTempQrCardById,
    getTempQrCards,
    markCardInUse,
    updateTempQrCardStatus,
};
