const floorService = require("../services/floor.service");
const slotService = require("../services/slot.service");
const { successResponse, errorResponse } = require("../utils/response");

const VALID_SLOT_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "OCCUPIED",
    "MAINTENANCE",
    "LOCKED",
    "CONFLICT",
];

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const normalizeEnum = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    return value.trim().toUpperCase();
};

const buildSlotPayload = (body, existingSlot = null) => {
    const slotCode =
        body.slotCode !== undefined
            ? String(body.slotCode).trim()
            : existingSlot.slotCode;

    if (!slotCode) {
        return {
            error: "Ma slot khong duoc de trong",
        };
    }

    const status =
        body.status !== undefined
            ? normalizeEnum(body.status)
            : existingSlot
              ? existingSlot.status
              : "AVAILABLE";

    if (!VALID_SLOT_STATUSES.includes(status)) {
        return {
            error: "Trang thai slot khong hop le",
        };
    }

    return {
        payload: {
            slotCode,
            status,
            sizeLabel:
                body.sizeLabel !== undefined
                    ? body.sizeLabel
                    : existingSlot?.sizeLabel,
            positionDescription:
                body.positionDescription !== undefined
                    ? body.positionDescription
                    : existingSlot?.positionDescription,
            note: body.note !== undefined ? body.note : existingSlot?.note,
        },
    };
};

const assertCarFloor = async (floorId) => {
    const floor = await floorService.getFloorById(floorId);

    if (!floor) {
        return {
            error: "Khong tim thay tang",
            statusCode: 404,
        };
    }

    if (floor.floorType !== "CAR") {
        return {
            error: "Tang MOTORBIKE quan ly bang capacity, khong tao slot rieng",
            statusCode: 400,
        };
    }

    return {
        floor,
    };
};

const createSlot = async (req, res) => {
    try {
        const { floorId } = req.params;

        if (!isValidId(floorId)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const { floor, error, statusCode } = await assertCarFloor(floorId);

        if (error) {
            return errorResponse(res, error, statusCode);
        }

        const { payload, error: payloadError } = buildSlotPayload(req.body, {
            slotCode: "",
            status: "AVAILABLE",
            sizeLabel: null,
            positionDescription: null,
            note: null,
        });

        if (payloadError) {
            return errorResponse(res, payloadError, 400);
        }

        const slot = await slotService.createSlot({
            buildingId: floor.buildingId,
            floorId,
            ...payload,
        });

        return successResponse(res, "Tao slot thanh cong", slot, 201);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ma slot da ton tai trong tang nay", 400);
        }

        return errorResponse(res, "Loi tao slot", 500, error.message);
    }
};

const getSlotsByFloorId = async (req, res) => {
    try {
        const { floorId } = req.params;

        if (!isValidId(floorId)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const { error, statusCode } = await assertCarFloor(floorId);

        if (error) {
            return errorResponse(res, error, statusCode);
        }

        const slots = await slotService.getSlotsByFloorId(floorId);

        return successResponse(res, "Lay danh sach slot thanh cong", slots);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach slot", 500, error.message);
    }
};

const getSlotById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Slot id khong hop le", 400);
        }

        const slot = await slotService.getSlotById(id);

        if (!slot) {
            return errorResponse(res, "Khong tim thay slot", 404);
        }

        return successResponse(res, "Lay chi tiet slot thanh cong", slot);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet slot", 500, error.message);
    }
};

const updateSlot = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Slot id khong hop le", 400);
        }

        const slot = await slotService.getSlotById(id);

        if (!slot) {
            return errorResponse(res, "Khong tim thay slot", 404);
        }

        const { payload, error } = buildSlotPayload(req.body, slot);

        if (error) {
            return errorResponse(res, error, 400);
        }

        const updatedSlot = await slotService.updateSlot({
            id,
            ...payload,
        });

        return successResponse(res, "Cap nhat slot thanh cong", updatedSlot);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Ma slot da ton tai trong tang nay", 400);
        }

        return errorResponse(res, "Loi cap nhat slot", 500, error.message);
    }
};

const deleteSlot = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Slot id khong hop le", 400);
        }

        const slot = await slotService.getSlotById(id);

        if (!slot) {
            return errorResponse(res, "Khong tim thay slot", 404);
        }

        await slotService.deleteSlot(id);

        return successResponse(res, "Xoa slot thanh cong", {
            id: Number(id),
        });
    } catch (error) {
        return errorResponse(res, "Loi xoa slot", 500, error.message);
    }
};

module.exports = {
    createSlot,
    getSlotsByFloorId,
    getSlotById,
    updateSlot,
    deleteSlot,
};
