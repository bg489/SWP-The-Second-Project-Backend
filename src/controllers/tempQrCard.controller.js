/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của tempQrCard.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `tempQrCardService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/tempQrCard.controller.js.
 */
const tempQrCardService = require("../services/tempQrCard.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/tempQrCard.controller.js.
 */
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    ROLES,
    TEMP_QR_CARD_STATUSES,
    isValidEnumValue,
    normalizeEnum,
    normalizeRole,
} = require("../utils/constants");

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
 * Tạo nghiệp vụ `createTempQrCard` (create temp qr card). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createTempQrCard
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createTempQrCard = async (req, res) => {
    try {
        const hasQuantity =
            req.body.quantity !== undefined &&
            req.body.quantity !== null &&
            req.body.quantity !== "";
        const quantity = hasQuantity ? Number(req.body.quantity) : 0;
        const cardCode =
            typeof req.body.cardCode === "string"
                ? req.body.cardCode.trim().toUpperCase()
                : "";
        const status = req.body.status ? normalizeEnum(req.body.status) : "READY";
        const buildingId = req.body.buildingId ? Number(req.body.buildingId) : null;

        if (!hasQuantity && !cardCode) {
            return errorResponse(res, "cardCode khong duoc de trong", 400);
        }

        if (!isValidEnumValue(TEMP_QR_CARD_STATUSES, status)) {
            return errorResponse(res, "status the QR tam khong hop le", 400, {
                allowedStatuses: Object.values(TEMP_QR_CARD_STATUSES),
            });
        }

        if (hasQuantity) {
            const tempQrCards = await tempQrCardService.createTempQrCardsBulk({
                buildingId,
                note: req.body.note,
                quantity,
                status,
            });

            return successResponse(res, "Tao the QR tam thanh cong", tempQrCards, 201);
        }

        const tempQrCard = await tempQrCardService.createTempQrCard({
            buildingId,
            cardCode,
            note: req.body.note,
            status,
        });

        return successResponse(res, "Tao the QR tam thanh cong", tempQrCard, 201);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return errorResponse(res, "cardCode da ton tai", 400);
        }

        return errorResponse(res, "Loi tao the QR tam", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getTempQrCards` (get temp qr cards). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getTempQrCards
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTempQrCards = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;
        const currentUser = await userService.getUserById(req.user.id);
        const currentRole = normalizeRole(req.user.role);
        const buildingId =
            currentRole === ROLES.STAFF
                ? currentUser?.buildingId
                : req.query.buildingId || currentUser?.buildingId;

        if (status && !isValidEnumValue(TEMP_QR_CARD_STATUSES, status)) {
            return errorResponse(res, "status the QR tam khong hop le", 400, {
                allowedStatuses: Object.values(TEMP_QR_CARD_STATUSES),
            });
        }

        const tempQrCards = await tempQrCardService.getTempQrCards({
            buildingId,
            status,
        });

        return successResponse(res, "Lay danh sach the QR tam thanh cong", tempQrCards);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach the QR tam",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getTempQrCardById` (get temp qr card by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getTempQrCardById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getTempQrCardById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Temp QR card id khong hop le", 400);
        }

        const tempQrCard = await tempQrCardService.getTempQrCardById(req.params.id);

        if (!tempQrCard) {
            return errorResponse(res, "Khong tim thay the QR tam", 404);
        }

        return successResponse(res, "Lay chi tiet the QR tam thanh cong", tempQrCard);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet the QR tam", 500, error.message);
    }
};

/**
 * Cập nhật nghiệp vụ `updateTempQrCardStatus` (update temp qr card status). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateTempQrCardStatus
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateTempQrCardStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return errorResponse(res, "Temp QR card id khong hop le", 400);
        }

        const status = normalizeEnum(req.body.status);

        if (!isValidEnumValue(TEMP_QR_CARD_STATUSES, status)) {
            return errorResponse(res, "status the QR tam khong hop le", 400, {
                allowedStatuses: Object.values(TEMP_QR_CARD_STATUSES),
            });
        }

        const existing = await tempQrCardService.getTempQrCardById(req.params.id);

        if (!existing) {
            return errorResponse(res, "Khong tim thay the QR tam", 404);
        }

        if (existing.status === "IN_USE" && !["COMPLETED", "LOST", "LOCKED"].includes(status)) {
            return errorResponse(
                res,
                "The dang IN_USE chi co the chuyen sang COMPLETED, LOST hoac LOCKED",
                400
            );
        }

        const tempQrCard = await tempQrCardService.updateTempQrCardStatus({
            id: req.params.id,
            note: req.body.note,
            status,
        });

        return successResponse(
            res,
            "Cap nhat trang thai the QR tam thanh cong",
            tempQrCard
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi cap nhat trang thai the QR tam",
            500,
            error.message
        );
    }
};

module.exports = {
    createTempQrCard,
    getTempQrCardById,
    getTempQrCards,
    updateTempQrCardStatus,
};
