const db = require("../config/db");

const pricingPolicySelect = `
    SELECT
        id,
        vehicle_type AS vehicleType,
        pricing_type AS pricingType,
        amount,
        status,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM pricing_policies
`;

const createPricingPolicy = async ({
    amount,
    description,
    pricingType,
    status,
    vehicleType,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if ((status || "ACTIVE") === "ACTIVE") {
            await connection.query(
                `UPDATE pricing_policies
                 SET status = 'INACTIVE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE vehicle_type = ?
                    AND pricing_type = ?
                    AND status = 'ACTIVE'`,
                [vehicleType, pricingType]
            );
        }

        const [result] = await connection.query(
            `INSERT INTO pricing_policies
                (vehicle_type, pricing_type, amount, status, description)
             VALUES (?, ?, ?, ?, ?)`,
            [
                vehicleType,
                pricingType,
                amount,
                status || "ACTIVE",
                description || null,
            ]
        );

        await connection.commit();

        return getPricingPolicyById(result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getPricingPolicies = async ({ pricingType, status, vehicleType } = {}) => {
    const conditions = [];
    const params = [];

    if (vehicleType) {
        conditions.push("vehicle_type = ?");
        params.push(vehicleType);
    }

    if (pricingType) {
        conditions.push("pricing_type = ?");
        params.push(pricingType);
    }

    if (status) {
        conditions.push("status = ?");
        params.push(status);
    }

    const whereSql =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `${pricingPolicySelect}
         ${whereSql}
         ORDER BY vehicle_type ASC, pricing_type ASC, id DESC`,
        params
    );

    return rows;
};

const getPricingPolicyById = async (id) => {
    const [rows] = await db.query(
        `${pricingPolicySelect}
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
};

const getActivePricingPolicy = async ({ pricingType, vehicleType }) => {
    const [rows] = await db.query(
        `${pricingPolicySelect}
         WHERE vehicle_type = ?
            AND pricing_type = ?
            AND status = 'ACTIVE'
         ORDER BY id DESC
         LIMIT 1`,
        [vehicleType, pricingType]
    );

    return rows[0] || null;
};

const updatePricingPolicy = async ({
    amount,
    description,
    id,
    pricingType,
    status,
    vehicleType,
}) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        if (status === "ACTIVE") {
            await connection.query(
                `UPDATE pricing_policies
                 SET status = 'INACTIVE',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE vehicle_type = ?
                    AND pricing_type = ?
                    AND status = 'ACTIVE'
                    AND id <> ?`,
                [vehicleType, pricingType, id]
            );
        }

        await connection.query(
            `UPDATE pricing_policies
             SET
                vehicle_type = ?,
                pricing_type = ?,
                amount = ?,
                status = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                vehicleType,
                pricingType,
                amount,
                status,
                description || null,
                id,
            ]
        );

        await connection.commit();

        return getPricingPolicyById(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const deactivatePricingPolicy = async (id) => {
    const [result] = await db.query(
        `UPDATE pricing_policies
         SET status = 'INACTIVE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createPricingPolicy,
    deactivatePricingPolicy,
    getActivePricingPolicy,
    getPricingPolicies,
    getPricingPolicyById,
    updatePricingPolicy,
};
