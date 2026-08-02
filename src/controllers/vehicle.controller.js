/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của vehicle.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `vehicleService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/vehicle.controller.js.
 */
const vehicleService = require("../services/vehicle.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/vehicle.controller.js.
 */
const userService = require("../services/user.service");
/**
 * Khai báo `notificationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/vehicle.controller.js.
 */
const notificationService = require("../services/notification.service");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Khai báo `MAX_VEHICLE_IMAGE_LENGTH` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/controllers/vehicle.controller.js.
 */
const MAX_VEHICLE_IMAGE_LENGTH = 1_200_000;

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `normalizeVehicleImageUrl` (normalize vehicle image url). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function normalizeVehicleImageUrl
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const normalizeVehicleImageUrl = (value) =>
    typeof value === "string" ? value.trim() : "";

/**
 * Kiểm tra nghiệp vụ `isValidVehicleImageUrl` (is valid vehicle image url). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidVehicleImageUrl
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidVehicleImageUrl = (value) => {
    if (!value || value.length > MAX_VEHICLE_IMAGE_LENGTH) return false;

    return (
        /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(value) ||
        /^https?:\/\//i.test(value)
    );
};

/**
 * Tạo nghiệp vụ `createVehicle` (create vehicle). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createVehicle
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createVehicle = async (req, res) => {
    try {
        const {
            plateNumber,
            vehicleType,
            brand,
            color,
            buildingId,
            plateImageUrl,
            vehiclePortraitImageUrl,
            vehicleLandscapeImageUrl,
        } = req.body;
        const normalizedPlateImageUrl = normalizeVehicleImageUrl(plateImageUrl);
        const normalizedVehiclePortraitImageUrl = normalizeVehicleImageUrl(
            vehiclePortraitImageUrl
        );
        const normalizedVehicleLandscapeImageUrl = normalizeVehicleImageUrl(
            vehicleLandscapeImageUrl
        );

        if (
            !plateNumber ||
            !vehicleType ||
            !normalizedPlateImageUrl ||
            !normalizedVehiclePortraitImageUrl ||
            !normalizedVehicleLandscapeImageUrl
        ) {
            return errorResponse(
                res,
                "Vui lòng nhập thông tin xe và chụp đủ ảnh biển số, ảnh dọc thân xe, ảnh ngang thân xe",
                400
            );
        }

        if (
            !isValidVehicleImageUrl(normalizedPlateImageUrl) ||
            !isValidVehicleImageUrl(normalizedVehiclePortraitImageUrl) ||
            !isValidVehicleImageUrl(normalizedVehicleLandscapeImageUrl)
        ) {
            return errorResponse(
                res,
                "Một trong các ảnh xe không hợp lệ hoặc có dung lượng quá lớn",
                400
            );
        }

        const validTypes = ["MOTORBIKE", "CAR"];

        if (!validTypes.includes(vehicleType)) {
            return errorResponse(
                res,
                "Loại xe không hợp lệ. Chỉ nhận MOTORBIKE hoặc CAR",
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
            plateImageUrl: normalizedPlateImageUrl,
            vehiclePortraitImageUrl: normalizedVehiclePortraitImageUrl,
            vehicleLandscapeImageUrl: normalizedVehicleLandscapeImageUrl,
        });

        return successResponse(res, "Thêm xe thành công, đang chờ duyệt", vehicle, 201);
    } catch (error) {
        return errorResponse(res, "Lỗi thêm xe", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMyVehicles` (get my vehicles). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyVehicles
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getVehiclesByUserId(req.user.id);

        return successResponse(res, "Lấy danh sách xe của tôi thành công", vehicles);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách xe của tôi", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getAllVehicles` (get all vehicles). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getAllVehicles
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await vehicleService.getAllVehicles();

        return successResponse(res, "Lấy danh sách xe thành công", vehicles);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách xe", 500, error.message);
    }
};

/**
 * Thực hiện nghiệp vụ `approveVehicle` (approve vehicle). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function approveVehicle
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const approveVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.getVehicleById(id);

        if (!vehicle) {
            return errorResponse(res, "Không tìm thấy xe", 404);
        }

        const updatedVehicle = await vehicleService.updateVehicleStatus(id, "APPROVED");

        await notificationService.createNotification({
            userId: Number(vehicle.user_id || vehicle.userId),
            title: "Xe đã được duyệt",
            message: `Xe biển số ${vehicle.plate_number || vehicle.plateNumber} đã được duyệt. Bạn có thể dùng xe này trong hệ thống.`,
            relatedType: "VEHICLE",
            relatedId: Number(id),
        });

        return successResponse(res, "Duyệt xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi duyệt xe", 500, error.message);
    }
};

/**
 * Thực hiện nghiệp vụ `rejectVehicle` (reject vehicle). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function rejectVehicle
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const rejectVehicle = async (req, res) => {
    try {
        const { id } = req.params;

        const vehicle = await vehicleService.getVehicleById(id);

        if (!vehicle) {
            return errorResponse(res, "Không tìm thấy xe", 404);
        }

        const updatedVehicle = await vehicleService.updateVehicleStatus(id, "REJECTED");

        await notificationService.createNotification({
            userId: Number(vehicle.user_id || vehicle.userId),
            title: "Xe bị từ chối",
            message: `Xe biển số ${vehicle.plate_number || vehicle.plateNumber} chưa được duyệt. Vui lòng kiểm tra lại thông tin xe.`,
            relatedType: "VEHICLE",
            relatedId: Number(id),
        });

        return successResponse(res, "Từ chối xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi từ chối xe", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMyVehicleById` (get my vehicle by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyVehicleById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

/**
 * Cập nhật nghiệp vụ `updateMyVehicle` (update my vehicle). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function updateMyVehicle
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const updateMyVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            plateNumber,
            vehicleType,
            brand,
            color,
            buildingId,
            plateImageUrl,
            vehiclePortraitImageUrl,
            vehicleLandscapeImageUrl,
        } = req.body;

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

        const normalizedPlateImageUrl =
            plateImageUrl === undefined
                ? normalizeVehicleImageUrl(vehicle.plateImageUrl)
                : normalizeVehicleImageUrl(plateImageUrl);
        const normalizedVehiclePortraitImageUrl =
            vehiclePortraitImageUrl === undefined
                ? normalizeVehicleImageUrl(vehicle.vehiclePortraitImageUrl)
                : normalizeVehicleImageUrl(vehiclePortraitImageUrl);
        const normalizedVehicleLandscapeImageUrl =
            vehicleLandscapeImageUrl === undefined
                ? normalizeVehicleImageUrl(vehicle.vehicleLandscapeImageUrl)
                : normalizeVehicleImageUrl(vehicleLandscapeImageUrl);

        if (
            !isValidVehicleImageUrl(normalizedPlateImageUrl) ||
            !isValidVehicleImageUrl(normalizedVehiclePortraitImageUrl) ||
            !isValidVehicleImageUrl(normalizedVehicleLandscapeImageUrl)
        ) {
            return errorResponse(
                res,
                "Vui lòng chụp đủ ba ảnh hợp lệ trước khi cập nhật xe",
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
            plateImageUrl: normalizedPlateImageUrl,
            vehiclePortraitImageUrl: normalizedVehiclePortraitImageUrl,
            vehicleLandscapeImageUrl: normalizedVehicleLandscapeImageUrl,
            buildingId: buildingId || vehicle.buildingId || null,
        });

        return successResponse(res, "Cập nhật xe thành công", updatedVehicle);
    } catch (error) {
        return errorResponse(res, "Lỗi cập nhật xe", 500, error.message);
    }
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `deleteMyVehicle` (delete my vehicle). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function deleteMyVehicle
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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
