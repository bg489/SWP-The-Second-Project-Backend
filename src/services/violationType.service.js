const db = require("../config/db");

const violationTypeSelect = `
    SELECT
        vt.id,
        vt.name,
        vt.default_penalty_fee AS defaultPenaltyFee,
        vt.status,
        vt.description,
        vt.created_by AS createdBy,
        u.name AS createdByName,
        vt.created_at AS createdAt,
        vt.updated_at AS updatedAt
    FROM violation_types vt
    LEFT JOIN users u ON vt.created_by = u.id
`;

const createViolationType = async ({
    createdBy,
    defaultPenaltyFee,
    description,
    name,
    status,
}) => {
    const [result] = await db.query(
        `INSERT INTO violation_types
            (name, default_penalty_fee, status, description, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
            name,
            defaultPenaltyFee,
            status || "ACTIVE",
            description || null,
            createdBy || null,
        ]
    );

    return getViolationTypeById(result.insertId);
};

const getViolationTypes = async ({ q, status } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("vt.status = ?");
        params.push(status);
    }

    if (q) {
        conditions.push("vt.name LIKE ?");
        params.push(`%${q}%`);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${violationTypeSelect}
         ${whereSql}
         ORDER BY vt.status ASC, vt.name ASC, vt.id DESC`,
        params
    );

    return rows;
};

const getViolationTypeById = async (id) => {
    const [rows] = await db.query(
        `${violationTypeSelect}
         WHERE vt.id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const updateViolationType = async ({
    defaultPenaltyFee,
    description,
    id,
    name,
    status,
}) => {
    await db.query(
        `UPDATE violation_types
         SET name = ?,
             default_penalty_fee = ?,
             status = ?,
             description = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, defaultPenaltyFee, status, description || null, id]
    );

    return getViolationTypeById(id);
};

const deactivateViolationType = async (id) => {
    await db.query(
        `UPDATE violation_types
         SET status = 'INACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );

    return getViolationTypeById(id);
};

module.exports = {
    createViolationType,
    deactivateViolationType,
    getViolationTypeById,
    getViolationTypes,
    updateViolationType,
};
