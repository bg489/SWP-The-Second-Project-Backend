/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của slot.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `floorService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/slot.controller.js.
 */
const floorService = require("../services/floor.service");
/**
 * Khai báo `slotService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/slot.controller.js.
 */
const slotService = require("../services/slot.service");
const { successResponse, errorResponse } = require("../utils/response");
const { ROLES, normalizeRole } = require("../utils/constants");

/**
 * Khai báo `VALID_SLOT_STATUSES` để định nghĩa tập lựa chọn, nhãn hoặc quy tắc hợp lệ dùng xuyên suốt module.
 * Phạm vi sử dụng: src/controllers/slot.controller.js.
 */
const VALID_SLOT_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "OCCUPIED",
    "MAINTENANCE",
    "LOCKED",
    "CONFLICT",
];

/**
 * Kiểm tra nghiệp vụ `isValidId` (is valid id). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidId
 * @param {*} id - Mã định danh của bản ghi cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeEnum` (normalize enum). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function normalizeEnum
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeEnum = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    return value.trim().toUpperCase();
};

/**
 * Tạo nghiệp vụ `buildSlotPayload` (build slot payload). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function buildSlotPayload
 * @param {*} body - Giá trị `body` được hàm sử dụng trong quá trình xử lý.
 * @param {*} existingSlot - Giá trị `existingSlot` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Thực hiện nghiệp vụ `assertCarFloor` (assert car floor). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function assertCarFloor
 * @param {*} floorId - Giá trị `floorId` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Tạo nghiệp vụ `createSlot` (create slot). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createSlot
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Lấy nghiệp vụ `getSlotsByFloorId` (get slots by floor id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getSlotsByFloorId
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getSlotsByFloorId = async (req, res) => {
    try {
        const { floorId } = req.params;

        if (!isValidId(floorId)) {
            return errorResponse(res, "Floor id khong hop le", 400);
        }

        const { floor, error, statusCode } = await assertCarFloor(floorId);

        if (error) {
            return errorResponse(res, error, statusCode);
        }

        if (
            normalizeRole(req.user?.role) === ROLES.USER &&
            (Number(floor.buildingId) !== Number(req.user?.buildingId) ||
                floor.status !== "ACTIVE")
        ) {
            return errorResponse(res, "Bạn không thể xem ô đỗ của tầng này", 403);
        }

        const slots = await slotService.getSlotsByFloorId(floorId);

        return successResponse(res, "Lay danh sach slot thanh cong", slots);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach slot", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getSlotById` (get slot by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getSlotById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateSlot` (update slot). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateSlot
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteSlot` (delete slot). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deleteSlot
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

        if (["OCCUPIED", "RESERVED"].includes(slot.status)) {
            return errorResponse(
                res,
                "Khong the xoa slot dang co xe hoac dang duoc dat cho",
                400
            );
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
