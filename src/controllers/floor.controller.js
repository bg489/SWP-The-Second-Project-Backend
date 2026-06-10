const buildingService = require("../services/building.service");
const floorService = require("../services/floor.service");
const { successResponse, errorResponse } = require("../utils/response");

const VALID_FLOOR_TYPES = ["MOTORBIKE", "CAR"];
const VALID_FLOOR_STATUSES = ["ACTIVE", "LOCKED", "MAINTENANCE", "INACTIVE"];

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const parsePositiveInteger = (value) => {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
        return null;
    }

    return numberValue;
};

const normalizeEnum = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    return value.trim().toUpperCase();
};

const buildFloorPayload = (body, existingFloor = null) => {
    const requestedFloorType =
        body.floorType !== undefined
            ? normalizeEnum(body.floorType)
            : existingFloor.floorType;
    const requestedStatus =
        body.status !== undefined
            ? normalizeEnum(body.status)
            : existingFloor
              ? existingFloor.status
              : "ACTIVE";

    if (!VALID_FLOOR_TYPES.includes(requestedFloorType)) {
        return {
            error: "floorType chi nhan MOTORBIKE hoac CAR",
        };
    }

    if (!VALID_FLOOR_STATUSES.includes(requestedStatus)) {
        return {
            error: "status khong hop le",
        };
    }

    const name =
        body.name !== undefined
            ? String(body.name).trim()
            : existingFloor.name;

    if (!name) {
        return {
            error: "Ten tang khong duoc de trong",
        };
    }

    let capacity = null;

    if (requestedFloorType === "MOTORBIKE") {
        const capacityValue =
            body.capacity !== undefined ? body.capacity : existingFloor.capacity;

        capacity = parsePositiveInteger(capacityValue);

        if (!capacity) {
            return {
                error: "Tang MOTORBIKE can capacity la so nguyen duong",
            };
        }
    }

    return {
        payload: {
            name,
            floorType: requestedFloorType,
            capacity,
            status: requestedStatus,
            note: body.note !== undefined ? body.note : existingFloor?.note,
        },
    };
};

const createFloor = async (req, res) => {
    try {
        const { buildingId } = req.params;

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Building id khong hop le", 400);
        }

        const building = await buildingService.getBuildingById(buildingId);

        if (!building) {
            return errorResponse(res, "Khong tim thay toa nha", 404);
        }

        const { payload, error } = buildFloorPayload(req.body, {
            floorType: null,
            status: "ACTIVE",
            name: "",
            capacity: null,
            note: null,
        });

        if (error) {
            return errorResponse(res, error, 400);
        }

        const floor = await floorService.createFloor({
            buildingId,
            ...payload,
        });

        return successResponse(res, "Tao tang thanh cong", floor, 201);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten tang da ton tai trong toa nha nay", 400);
        }

        return errorResponse(res, "Loi tao tang", 500, error.message);
    }
};

const getFloorsByBuildingId = async (req, res) => {
    try {
        const { buildingId } = req.params;

        if (!isValidId(buildingId)) {
            return errorResponse(res, "Building id khong hop le", 400);
        }

        const building = await buildingService.getBuildingById(buildingId);

        if (!building) {
            return errorResponse(res, "Khong tim thay toa nha", 404);
        }

        const floors = await floorService.getFloorsByBuildingId(buildingId);

        return successResponse(res, "Lay danh sach tang thanh cong", floors);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach tang", 500, error.message);
    }
};

const getFloorById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const floor = await floorService.getFloorById(id);

        if (!floor) {
            return errorResponse(res, "Khong tim thay tang", 404);
        }

        return successResponse(res, "Lay chi tiet tang thanh cong", floor);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet tang", 500, error.message);
    }
};

const updateFloor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const floor = await floorService.getFloorById(id);

        if (!floor) {
            return errorResponse(res, "Khong tim thay tang", 404);
        }

        const { payload, error } = buildFloorPayload(req.body, floor);

        if (error) {
            return errorResponse(res, error, 400);
        }

        if (payload.floorType !== "CAR") {
            const slotCount = await floorService.countSlotsByFloorId(id);

            if (slotCount > 0) {
                return errorResponse(
                    res,
                    "Tang dang co slot oto, hay xoa slot truoc khi doi sang MOTORBIKE",
                    400
                );
            }
        }

        const updatedFloor = await floorService.updateFloor({
            id,
            ...payload,
        });

        return successResponse(res, "Cap nhat tang thanh cong", updatedFloor);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ten tang da ton tai trong toa nha nay", 400);
        }

        return errorResponse(res, "Loi cap nhat tang", 500, error.message);
    }
};

const deleteFloor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const floor = await floorService.getFloorById(id);

        if (!floor) {
            return errorResponse(res, "Khong tim thay tang", 404);
        }

        await floorService.deleteFloor(id);

        return successResponse(res, "Xoa tang thanh cong", {
            id: Number(id),
        });
    } catch (error) {
        return errorResponse(res, "Loi xoa tang", 500, error.message);
    }
};

module.exports = {
    createFloor,
    getFloorsByBuildingId,
    getFloorById,
    updateFloor,
    deleteFloor,
};
