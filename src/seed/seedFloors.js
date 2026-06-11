const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    override: true,
});

const db = require("../config/db");

const ensureDefaultBuilding = async () => {
    const [rows] = await db.query(
        `SELECT id
         FROM buildings
         WHERE name = ?
         LIMIT 1`,
        ["FPT Parking Building"]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const [result] = await db.query(
        `INSERT INTO buildings (name, address)
         VALUES (?, ?)`,
        ["FPT Parking Building", "Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM"]
    );

    return result.insertId;
};

const seedFloors = async () => {
    const connection = await db.getConnection();

    try {
        console.log("Seeding parking floors into parking_floors / parking_slots...");

        const buildingId = await ensureDefaultBuilding();

        await connection.beginTransaction();

        const [oldRows] = await connection.query(
            `SELECT id
             FROM parking_floors
             WHERE building_id = ? AND name IN (?, ?)`,
            [buildingId, "Tầng xe máy B1", "Tầng ô tô B2"]
        );

        const oldIds = oldRows.map((row) => row.id);

        if (oldIds.length > 0) {
            await connection.query(
                `DELETE FROM parking_slots
                 WHERE floor_id IN (?) AND status = 'AVAILABLE'`,
                [oldIds]
            );

            await connection.query(
                `DELETE FROM parking_floors
                 WHERE id IN (?)`,
                [oldIds]
            );
        }

        await connection.query(
            `INSERT INTO parking_floors
                (building_id, name, floor_type, capacity, status, note, slot_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                buildingId,
                "Tầng xe máy B1",
                "MOTORBIKE",
                500,
                "ACTIVE",
                "Khu xe máy cư dân",
                0,
            ]
        );

        const [carFloorResult] = await connection.query(
            `INSERT INTO parking_floors
                (building_id, name, floor_type, capacity, status, note, slot_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                buildingId,
                "Tầng ô tô B2",
                "CAR",
                null,
                "ACTIVE",
                "Khu ô tô khách",
                5,
            ]
        );

        const carFloorId = carFloorResult.insertId;
        const slotValues = ["B2-CAR-01", "B2-CAR-02", "B2-CAR-03", "B2-CAR-04", "B2-CAR-05"].map((slotCode) => [
            buildingId,
            carFloorId,
            slotCode,
            "AVAILABLE",
            "STANDARD",
            null,
            "Seed slot",
        ]);

        await connection.query(
            `INSERT INTO parking_slots
                (building_id, floor_id, slot_code, status, size_label, position_description, note)
             VALUES ?`,
            [slotValues]
        );

        await connection.commit();

        console.log("Seed floors completed successfully.");
        process.exit(0);
    } catch (error) {
        await connection.rollback();
        console.error("Seed floors failed:", error.message);
        process.exit(1);
    } finally {
        connection.release();
    }
};

seedFloors();
