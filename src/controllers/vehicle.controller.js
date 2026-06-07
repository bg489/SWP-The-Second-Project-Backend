const vehicleService = require("../services/vehicle.service");
const userService = require("../services/user.service");
const { successResponse, errorResponse } = require("../utils/response");

const createVehicle = async (req, res) => {
    try {
        const { plateNumber, vehicleType, brand, color, buildingId } = req.body;

        if (!plateNumber || !vehicleType) {
            return errorResponse(res, "Vui lòng nhập biển số xe và loại xe", 400);
        }

        const validTypes = ["MOTORBIKE", "CAR", "BICYCLE"];

        if (!validTypes.includes(vehicleType)) {
            return errorResponse(
                res,
                "Loại xe không hợp lệ. Chỉ nhận MOTORBIKE, CAR hoặc BICYCLE",
                400
            );
        }

        const existedVehicle = await vehicleService.findVehicleByPlateNumber(plateNumber);

        if (existedVehicle) {
            return errorResponse(res, "Biển số xe đã tồn tại", 400);
        }

        const currentUser = await userService.getUserById(req.user.id);

        if (!currentUser) {
            return errorResponse(res, "Không tìm thấy user", 404);
        }

        const vehicle = await vehicleService.createVehicle({
            userId: req.user.id,
            buildingId: buildingId || currentUser.buildingId || null,
            plateNumber,
            vehicleType,
            brand,
            color,
        });

        return successResponse(res, "Thêm xe thành công, đang chờ duyệt", vehicle, 201);
    } catch (error) {
        return errorResponse(res, "Lỗi thêm xe", 500, error.message);
    }
};

const getMyVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getVehiclesByUserId(req.user.id);

        return successResponse(res, "Lấy danh sách xe của tôi thành công", vehicles);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách xe của tôi", 500, error.message);
    }
};

const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getAllVehicles();

        return successResponse(res, "Lấy danh sách xe thành công", vehicles);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách xe", 500, error.message);
    }
};

const approveVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.getVehicleById(id);

        if (!vehicle) {
            return errorResponse(res, "Không tìm thấy xe", 404);
        }

        const updatedVehicle = await vehicleService.updateVehicleStatus(id, "APPROVED");

        return successResponse(res, "Duyệt xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi duyệt xe", 500, error.message);
    }
};

const rejectVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.getVehicleById(id);

        if (!vehicle) {
            return errorResponse(res, "Không tìm thấy xe", 404);
        }

        const updatedVehicle = await vehicleService.updateVehicleStatus(id, "REJECTED");

        return successResponse(res, "Từ chối xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi từ chối xe", 500, error.message);
    }
};

const getMyVehicleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "Vehicle id không hợp lệ", 400);
        }

        const vehicle = await vehicleService.getVehicleByIdAndUserId(
            id,
            req.user.id
        );

        if (!vehicle) {
            return errorResponse(
                res,
                "Không tìm thấy xe hoặc bạn không có quyền xem xe này",
                404
            );
        }

        return successResponse(res, "Lấy chi tiết xe thành công", vehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy chi tiết xe", 500, error.message);
    }
};

const updateMyVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { plateNumber, vehicleType, brand, color, buildingId } = req.body;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "Vehicle id không hợp lệ", 400);
        }

        if (!plateNumber || !plateNumber.trim()) {
            return errorResponse(res, "Biển số xe không được để trống", 400);
        }

        if (!vehicleType) {
            return errorResponse(res, "Loại xe không được để trống", 400);
        }

        const validTypes = ["MOTORBIKE", "CAR"];

        if (!validTypes.includes(vehicleType)) {
            return errorResponse(
                res,
                "Loại xe không hợp lệ. Chỉ nhận MOTORBIKE hoặc CAR",
                400
            );
        }

        const vehicle = await vehicleService.getVehicleByIdAndUserId(
            id,
            req.user.id
        );

        if (!vehicle) {
            return errorResponse(
                res,
                "Không tìm thấy xe hoặc bạn không có quyền cập nhật xe này",
                404
            );
        }

        if (vehicle.status !== "PENDING") {
            return errorResponse(
                res,
                "Chỉ được cập nhật xe khi xe đang chờ duyệt",
                400
            );
        }

        const existedVehicle = await vehicleService.findVehicleByPlateNumberExceptId(
            plateNumber.trim(),
            id
        );

        if (existedVehicle) {
            return errorResponse(res, "Biển số xe đã tồn tại", 400);
        }

        const updatedVehicle = await vehicleService.updateVehicleByIdAndUserId({
            id,
            userId: req.user.id,
            plateNumber: plateNumber.trim(),
            vehicleType,
            brand,
            color,
            buildingId: buildingId || vehicle.buildingId || null,
        });

        return successResponse(res, "Cập nhật xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật xe", 500, error.message);
    }
};

const deleteMyVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return errorResponse(res, "Vehicle id không hợp lệ", 400);
        }

        const vehicle = await vehicleService.getVehicleByIdAndUserId(
            id,
            req.user.id
        );

        if (!vehicle) {
            return errorResponse(
                res,
                "Không tìm thấy xe hoặc bạn không có quyền xóa xe này",
                404
            );
        }

        if (vehicle.status === "APPROVED") {
            return errorResponse(
                res,
                "Không thể xóa xe đã được duyệt. Vui lòng liên hệ admin nếu cần hủy xe",
                400
            );
        }

        const deleted = await vehicleService.deleteVehicleByIdAndUserId(
            id,
            req.user.id
        );

        if (!deleted) {
            return errorResponse(res, "Xóa xe thất bại", 500);
        }

        return successResponse(res, "Xóa xe thành công", {
            id: Number(id),
        });
    } catch (error) {
        return errorResponse(res, "Lỗi xóa xe", 500, error.message);
    }
};

module.exports = {
    createVehicle,
    getMyVehicles,
    getMyVehicleById,
    updateMyVehicle,
    deleteMyVehicle,
    getAllVehicles,
    approveVehicle,
    rejectVehicle,
};