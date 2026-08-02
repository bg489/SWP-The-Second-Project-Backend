/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của building.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `buildingService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/building.controller.js.
 */
const buildingService = require("../services/building.service");
const { successResponse, errorResponse } = require("../utils/response");

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
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseRequiredMoney` (parse required money). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parseRequiredMoney
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parseRequiredMoney = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Tạo nghiệp vụ `createBuilding` (create building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createBuilding = async (req, res) => {
    try {
        const {
            address,
            carHourlyPrice,
            carMonthlyPrice,
            motorbikeMonthlyPrice,
            motorbikeTurnPrice,
            name,
        } = req.body;

        if (!name || !name.trim()) {
            return errorResponse(res, "Ten toa nha khong duoc de trong", 400);
        }

        const parsedMotorbikeTurnPrice = parseRequiredMoney(motorbikeTurnPrice);
        const parsedCarHourlyPrice = parseRequiredMoney(carHourlyPrice);
        const parsedMotorbikeMonthlyPrice = parseRequiredMoney(motorbikeMonthlyPrice);
        const parsedCarMonthlyPrice = parseRequiredMoney(carMonthlyPrice);

        if (
            !parsedMotorbikeTurnPrice ||
            !parsedCarHourlyPrice ||
            !parsedMotorbikeMonthlyPrice ||
            !parsedCarMonthlyPrice
        ) {
            return errorResponse(
                res,
                "Can nhap du gia xe may 1 luot, oto 1 gio, goi thang xe may va goi thang oto",
                400
            );
        }

        const building = await buildingService.createBuilding({
            name: name.trim(),
            address,
            motorbikeTurnPrice: parsedMotorbikeTurnPrice,
            carHourlyPrice: parsedCarHourlyPrice,
            motorbikeMonthlyPrice: parsedMotorbikeMonthlyPrice,
            carMonthlyPrice: parsedCarMonthlyPrice,
        });

        return successResponse(res, "Tao toa nha thanh cong", building, 201);
    } catch (error) {
        return errorResponse(res, "Loi tao toa nha", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getAllBuildings` (get all buildings). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getAllBuildings
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAllBuildings = async (req, res) => {
    try {
        const buildings = await buildingService.getAllBuildings();

        return successResponse(res, "Lay danh sach toa nha thanh cong", buildings);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach toa nha", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getBuildingById` (get building by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getBuildingById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getBuildingById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Building id khong hop le", 400);
        }

        const building = await buildingService.getBuildingById(id);

        if (!building) {
            return errorResponse(res, "Khong tim thay toa nha", 404);
        }

        return successResponse(res, "Lay chi tiet toa nha thanh cong", building);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet toa nha", 500, error.message);
    }
};

/**
 * Cập nhật nghiệp vụ `updateBuilding` (update building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address } = req.body;

        if (!isValidId(id)) {
            return errorResponse(res, "Building id khong hop le", 400);
        }

        const building = await buildingService.getBuildingById(id);

        if (!building) {
            return errorResponse(res, "Khong tim thay toa nha", 404);
        }

        if (name !== undefined && !name.trim()) {
            return errorResponse(res, "Ten toa nha khong duoc de trong", 400);
        }

        const updatedBuilding = await buildingService.updateBuilding({
            id,
            name: name !== undefined ? name.trim() : building.name,
            address: address !== undefined ? address : building.address,
        });

        return successResponse(res, "Cap nhat toa nha thanh cong", updatedBuilding);
    } catch (error) {
        return errorResponse(res, "Loi cap nhat toa nha", 500, error.message);
    }
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteBuilding` (delete building). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deleteBuilding
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const deleteBuilding = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Building id khong hop le", 400);
        }

        const building = await buildingService.getBuildingById(id);

        if (!building) {
            return errorResponse(res, "Khong tim thay toa nha", 404);
        }

        await buildingService.deleteBuilding(id);

        return successResponse(res, "Xoa toa nha thanh cong", {
            id: Number(id),
        });
    } catch (error) {
        return errorResponse(res, "Loi xoa toa nha", 500, error.message);
    }
};

module.exports = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
    updateBuilding,
    deleteBuilding,
};
