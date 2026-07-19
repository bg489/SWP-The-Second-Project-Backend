const floorService = require("../services/floor.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    FLOOR_TYPES,
    FLOOR_STATUSES,
    ROLES,
    normalizeEnum,
    normalizeRole,
    isValidEnumValue,
} = require("../utils/constants");

const toPositiveInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        return null;
    }

    return number;
};

const normalizeSlots = ({ slots, slotList }) => {
    if (Array.isArray(slots)) {
        return slots.map((slot) => String(slot).trim().toUpperCase()).filter(Boolean);
    }

    if (typeof slotList === "string") {
        return slotList
            .split(",")
            .map((slot) => slot.trim().toUpperCase())
            .filter(Boolean);
    }

    return [];
};

const normalizeSlotPrefix = (value) => {
    const normalized = String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toUpperCase();

    return normalized || "CAR";
};

const generateCarSlots = (prefix, slotCount) => {
    return Array.from({ length: slotCount }, (_, index) => {
        const slotNumber = String(index + 1).padStart(2, "0");
        return `${prefix}-${slotNumber}`;
    });
};

const validateFloorPayload = (body, options = {}) => {
    const buildingId = toPositiveInteger(options.buildingId || body.buildingId || body.building_id);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const slotPrefix = normalizeSlotPrefix(body.slotPrefix || body.slot_prefix || code || name);
    const floorType = normalizeEnum(body.floorType || body.floor_type);
    const status = normalizeEnum(body.status || FLOOR_STATUSES.ACTIVE);
    const operationNote =
        typeof body.operationNote === "string"
            ? body.operationNote.trim()
            : typeof body.operation_note === "string"
                ? body.operation_note.trim()
                : typeof body.note === "string"
                    ? body.note.trim()
                    : null;

    if (!buildingId) {
        return { error: "buildingId là bắt buộc và phải là số nguyên dương" };
    }

    if (!name) {
        return { error: "Tên tầng không được để trống" };
    }

    if (!floorType || !isValidEnumValue(FLOOR_TYPES, floorType)) {
        return {
            error: "Loại tầng không hợp lệ. Chỉ nhận MOTORBIKE hoặc CAR",
            details: { allowedFloorTypes: Object.values(FLOOR_TYPES) },
        };
    }

    if (!status || !isValidEnumValue(FLOOR_STATUSES, status)) {
        return {
            error: "Trạng thái tầng không hợp lệ",
            details: { allowedStatuses: Object.values(FLOOR_STATUSES) },
        };
    }

    let capacity = toPositiveInteger(body.capacity);
    let slotCount = toPositiveInteger(body.slotCount || body.slot_count);
    let slots = normalizeSlots({ slots: body.slots, slotList: body.slotList || body.slot_list });

    if (floorType === FLOOR_TYPES.MOTORBIKE) {
        if (!capacity) {
            return { error: "Tầng MOTORBIKE bắt buộc nhập capacity là số nguyên dương" };
        }

        slotCount = 0;
        slots = [];
    }

    if (floorType === FLOOR_TYPES.CAR) {
        if (!slotCount) {
            return { error: "Tầng CAR bắt buộc nhập slotCount là số nguyên dương" };
        }

        capacity = null;

        if (slots.length > 0 && slots.length !== slotCount) {
            return {
                error: "Số lượng slot trong danh sách phải bằng slotCount",
                details: {
                    slotCount,
                    slotsLength: slots.length,
                },
            };
        }

        if (slots.length === 0) {
            slots = generateCarSlots(slotPrefix, slotCount);
        }

        const uniqueSlots = new Set(slots);

        if (uniqueSlots.size !== slots.length) {
            return { error: "Danh sách mã slot không được trùng nhau" };
        }
    }

    return {
        value: {
            buildingId,
            name,
            code,
            floorType,
            capacity,
            slotCount,
            slots,
            status,
            operationNote,
        },
    };
};

const createFloor = async (req, res) => {
    try {
        const validation = validateFloorPayload(req.body, {
            buildingId: req.params.buildingId,
        });

        if (validation.error) {
            return errorResponse(res, validation.error, 400, validation.details || null);
        }

        const building = await floorService.getBuildingById(validation.value.buildingId);

        if (!building) {
            return errorResponse(res, "Không tìm thấy tòa nhà", 404);
        }

        const existedFloor = await floorService.findFloorByNameAndBuilding({
            name: validation.value.name,
            buildingId: validation.value.buildingId,
        });

        if (existedFloor) {
            return errorResponse(res, "Tên tầng đã tồn tại trong tòa nhà này", 400);
        }

        const floor = await floorService.createFloor(validation.value);

        return successResponse(res, "Tạo tầng gửi xe thành công", floor, 201);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "Tên tầng hoặc mã slot đã tồn tại", 400);
        }

        return errorResponse(res, "Lỗi tạo tầng gửi xe", 500, error.message);
    }
};

const getFloors = async (req, res) => {
    try {
        const currentRole = normalizeRole(req.user?.role);
        const isResident = currentRole === ROLES.USER;
        const floorType = req.query.floorType || req.query.floor_type
            ? normalizeEnum(req.query.floorType || req.query.floor_type)
            : undefined;
        const requestedStatus = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const requestedBuildingId = req.query.buildingId || req.query.building_id
            ? toPositiveInteger(req.query.buildingId || req.query.building_id)
            : undefined;
        const residentBuildingId = toPositiveInteger(req.user?.buildingId);

        if (isResident && !residentBuildingId) {
            return errorResponse(res, "Tài khoản chưa được gán tòa nhà", 400);
        }

        if (
            isResident &&
            requestedBuildingId &&
            requestedBuildingId !== residentBuildingId
        ) {
            return errorResponse(res, "Bạn chỉ có thể xem tầng thuộc tòa nhà của mình", 403);
        }

        const buildingId = isResident ? residentBuildingId : requestedBuildingId;
        const status = isResident ? FLOOR_STATUSES.ACTIVE : requestedStatus;

        if (floorType && !isValidEnumValue(FLOOR_TYPES, floorType)) {
            return errorResponse(res, "Loại tầng không hợp lệ", 400, {
                allowedFloorTypes: Object.values(FLOOR_TYPES),
            });
        }

        if (status && !isValidEnumValue(FLOOR_STATUSES, status)) {
            return errorResponse(res, "Trạng thái tầng không hợp lệ", 400, {
                allowedStatuses: Object.values(FLOOR_STATUSES),
            });
        }

        const result = await floorService.getFloors({
            q: req.query.q,
            buildingId,
            floorType,
            status,
            page: req.query.page,
            limit: req.query.limit,
        });

        return successResponse(res, "Lấy danh sách tầng gửi xe thành công", result);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách tầng gửi xe", 500, error.message);
    }
};

const getFloorsByBuildingId = async (req, res) => {
    try {
        const buildingId = toPositiveInteger(req.params.buildingId);

        if (!buildingId) {
            return errorResponse(res, "Building id không hợp lệ", 400);
        }

        const building = await floorService.getBuildingById(buildingId);

        if (!building) {
            return errorResponse(res, "Không tìm thấy tòa nhà", 404);
        }

        const floors = await floorService.getFloorsByBuildingId(buildingId);

        return successResponse(res, "Lấy danh sách tầng gửi xe thành công", floors);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách tầng gửi xe", 500, error.message);
    }
};

const getFloorById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "Floor id không hợp lệ", 400);
        }

        const floor = await floorService.getFloorById(id);

        if (!floor) {
            return errorResponse(res, "Không tìm thấy tầng gửi xe", 404);
        }

        if (
            normalizeRole(req.user?.role) === ROLES.USER &&
            (Number(floor.buildingId) !== Number(req.user?.buildingId) ||
                floor.status !== FLOOR_STATUSES.ACTIVE)
        ) {
            return errorResponse(res, "Bạn không thể xem tầng này", 403);
        }

        return successResponse(res, "Lấy chi tiết tầng gửi xe thành công", floor);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy chi tiết tầng gửi xe", 500, error.message);
    }
};

const updateFloor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id)) || Number(id) <= 0) {
            return errorResponse(res, "Floor id không hợp lệ", 400);
        }

        const existingFloor = await floorService.getFloorById(id);

        if (!existingFloor) {
            return errorResponse(res, "Không tìm thấy tầng", 404);
        }

        const payload = {};

        if (req.body.buildingId !== undefined) {
            const buildingId = Number(req.body.buildingId);

            if (!Number.isInteger(buildingId) || buildingId <= 0) {
                return errorResponse(res, "buildingId không hợp lệ", 400);
            }

            payload.buildingId = buildingId;
        }

        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();

            if (!name) {
                return errorResponse(res, "Tên tầng không được để trống", 400);
            }

            payload.name = name;
        }

        if (req.body.status !== undefined) {
            const status = String(req.body.status).trim().toUpperCase();
            const validStatuses = ["ACTIVE", "LOCKED", "MAINTENANCE", "INACTIVE"];

            if (!validStatuses.includes(status)) {
                return errorResponse(
                    res,
                    "Trạng thái tầng không hợp lệ",
                    400
                );
            }

            payload.status = status;
        }

        if (req.body.operationNote !== undefined) {
            payload.note = req.body.operationNote || null;
        }

        if (req.body.note !== undefined) {
            payload.note = req.body.note || null;
        }

        /**
         * PATCH chỉ cho đổi floorType nếu gửi floorType hợp lệ.
         * Nếu frontend không gửi floorType thì giữ nguyên loại tầng cũ.
         */
        if (req.body.floorType !== undefined) {
            const floorType = String(req.body.floorType).trim().toUpperCase();
            const validFloorTypes = ["MOTORBIKE", "CAR"];

            if (!validFloorTypes.includes(floorType)) {
                return errorResponse(
                    res,
                    "Loại tầng không hợp lệ. Chỉ nhận MOTORBIKE hoặc CAR",
                    400
                );
            }

            payload.floorType = floorType;
        }

        const finalFloorType =
            payload.floorType || existingFloor.floorType || existingFloor.floor_type;

        /**
         * MOTORBIKE quản lý bằng capacity.
         * Chỉ validate capacity nếu request có gửi capacity.
         */
        if (finalFloorType === "MOTORBIKE" && req.body.capacity !== undefined) {
            const capacity = Number(req.body.capacity);

            if (!Number.isInteger(capacity) || capacity <= 0) {
                return errorResponse(
                    res,
                    "Tầng MOTORBIKE bắt buộc nhập capacity là số nguyên dương",
                    400
                );
            }

            payload.capacity = capacity;
        }

        /**
         * CAR quản lý slot bằng API slot riêng:
         * POST /api/floors/:floorId/slots
         * PATCH /api/slots/:id
         * DELETE /api/slots/:id
         *
         * Vì vậy PATCH /api/floors/:id KHÔNG xử lý slotCount/slots nữa.
         * Tránh lỗi thiếu slotCount và tránh đổi mã slot kiểu CAR-B06 -> B2-06.
         */
        delete payload.slotCount;
        delete payload.slots;

        const updatedFloor = await floorService.updateFloor(id, payload);

        return successResponse(res, "Cập nhật tầng thành công", updatedFloor);
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Lỗi cập nhật tầng",
            error.statusCode || 500
        );
    }
};

const deleteFloor = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "Floor id không hợp lệ", 400);
        }

        const floor = await floorService.getFloorById(id);

        if (!floor) {
            return errorResponse(res, "Không tìm thấy tầng gửi xe", 404);
        }

        await floorService.deleteFloor(id);

        return successResponse(res, "Xóa tầng gửi xe thành công", {
            id: Number(id),
        });
    } catch (error) {
        return errorResponse(
            res,
            error.statusCode === 400 ? error.message : "Lỗi xóa tầng gửi xe",
            error.statusCode || 500,
            error.statusCode === 400 ? null : error.message
        );
    }
};

module.exports = {
    createFloor,
    getFloors,
    getFloorsByBuildingId,
    getFloorById,
    updateFloor,
    deleteFloor,
};
