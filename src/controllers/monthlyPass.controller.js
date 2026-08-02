/**
 * @fileoverview Tiếp nhận yêu cầu HTTP của monthlyPass.controller, kiểm tra đầu vào, gọi lớp nghiệp vụ và tạo phản hồi API.
 *
 * Luồng chính: Route -> middleware -> controller -> service -> response chuẩn hóa trả về client.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `monthlyPassService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/monthlyPass.controller.js.
 */
const monthlyPassService = require("../services/monthlyPass.service");
/**
 * Khai báo `qrPassService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/monthlyPass.controller.js.
 */
const qrPassService = require("../services/qrPass.service");
/**
 * Khai báo `userService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/controllers/monthlyPass.controller.js.
 */
const userService = require("../services/user.service");
const { createPaymentUrl, getClientIp } = require("../utils/vnpay");
const { successResponse, errorResponse } = require("../utils/response");
const { ROLES, normalizeRole } = require("../utils/constants");

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
 * Kiểm tra nghiệp vụ `isValidDateString` (is valid date string). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function isValidDateString
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isValidDateString = (date) => {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseNonNegativeAmount` (parse non negative amount). Hàm hỗ trợ controller chuẩn hóa, kiểm tra hoặc tính toán dữ liệu trước khi tạo response.
 *
 * @function parseNonNegativeAmount
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parseNonNegativeAmount = (value) => {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
};

/**
 * Tạo nghiệp vụ `createMonthlyPass` (create monthly pass). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createMonthlyPass
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createMonthlyPass = async (req, res) => {
    try {
        const { amount, endDate, note, startDate, vehicleId } = req.body;

        if (!isValidId(vehicleId)) {
            return errorResponse(res, "vehicleId khong hop le", 400);
        }

        if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
            return errorResponse(
                res,
                "startDate va endDate phai co dinh dang YYYY-MM-DD",
                400
            );
        }

        if (endDate < startDate) {
            return errorResponse(res, "endDate phai lon hon hoac bang startDate", 400);
        }

        const parsedAmount = parseNonNegativeAmount(amount);

        if (parsedAmount === null) {
            return errorResponse(res, "amount phai la so nguyen khong am", 400);
        }

        const vehicle = await monthlyPassService.getVehicleForMonthlyPass(vehicleId);

        if (!vehicle) {
            return errorResponse(res, "Khong tim thay xe", 404);
        }

        if (vehicle.status !== "APPROVED") {
            return errorResponse(res, "Xe phai duoc admin duyet truoc khi tao the thang", 400);
        }

        const monthlyPass = await monthlyPassService.createMonthlyPass({
            amount: parsedAmount,
            buildingId: vehicle.buildingId,
            endDate,
            note,
            startDate,
            userId: vehicle.userId,
            vehicleId,
            vehicleType: vehicle.vehicleType,
        });
        const qrPass = await qrPassService.createQrPassForMonthlyPass({
            createdBy: req.user.id,
            monthlyPassId: monthlyPass.id,
            note: "Auto generated for manual monthly pass",
        });

        return successResponse(
            res,
            "Tao the thang thanh cong",
            {
                monthlyPass,
                qrPass,
            },
            201
        );
    } catch (error) {
        return errorResponse(res, "Loi tao the thang", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMonthlyPasses` (get monthly passes). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMonthlyPasses
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPasses = async (req, res) => {
    try {
        const currentUser = await userService.getUserById(req.user.id);
        const currentRole = normalizeRole(req.user.role);
        const buildingId =
            [ROLES.ADMIN, ROLES.MANAGER].includes(currentRole)
                ? req.query.buildingId
                : currentUser?.buildingId || req.query.buildingId;
        const monthlyPasses = await monthlyPassService.getMonthlyPasses({
            buildingId,
            status: req.query.status,
        });

        return successResponse(res, "Lay danh sach the thang thanh cong", monthlyPasses);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach the thang", 500, error.message);
    }
};

/**
 * Lấy nghiệp vụ `getMyMonthlyPasses` (get my monthly passes). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMyMonthlyPasses
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMyMonthlyPasses = async (req, res) => {
    try {
        const monthlyPasses = await monthlyPassService.getMyMonthlyPasses(
            req.user.id
        );

        return successResponse(
            res,
            "Lay danh sach the thang cua ban thanh cong",
            monthlyPasses
        );
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay danh sach the thang cua ban",
            500,
            error.message
        );
    }
};

/**
 * Lấy nghiệp vụ `getMonthlyPassById` (get monthly pass by id). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function getMonthlyPassById
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const getMonthlyPassById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Monthly pass id khong hop le", 400);
        }

        const monthlyPass = await monthlyPassService.getMonthlyPassById(id);

        if (!monthlyPass) {
            return errorResponse(res, "Khong tim thay the thang", 404);
        }

        return successResponse(res, "Lay chi tiet the thang thanh cong", monthlyPass);
    } catch (error) {
        return errorResponse(res, "Loi lay chi tiet the thang", 500, error.message);
    }
};

/**
 * Tạo nghiệp vụ `createMyMonthlyPassPaymentUrl` (create my monthly pass payment url). Hàm đọc request, kiểm tra dữ liệu và trả response HTTP theo cấu trúc chung. Kết quả được chuyển thành phản hồi thành công hoặc lỗi có mã trạng thái phù hợp.
 *
 * @function createMyMonthlyPassPaymentUrl
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @param {*} res - Đối tượng response HTTP dùng để trả kết quả cho client.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const createMyMonthlyPassPaymentUrl = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return errorResponse(res, "Monthly pass id khong hop le", 400);
        }

        const monthlyPass = await monthlyPassService.getMonthlyPassByIdAndUserId({
            id,
            userId: req.user.id,
        });

        if (!monthlyPass) {
            return errorResponse(res, "Khong tim thay the thang cua ban", 404);
        }

        if (monthlyPass.status !== "PENDING_PAYMENT") {
            return errorResponse(res, "The thang nay khong cho thanh toan", 400);
        }

        if (!monthlyPass.paymentId || !monthlyPass.transactionRef) {
            return errorResponse(res, "Khong tim thay yeu cau thanh toan", 404);
        }

        const transactionRef = `PLAN${Date.now()}U${req.user.id}V${
            monthlyPass.vehicleId
        }`;
        const orderInfo = `Thanh toan goi thang ${
            monthlyPass.packagePlanName || "goi thang"
        } cho xe ${monthlyPass.plateNumber}`;
        const paymentUrl = createPaymentUrl({
            amount: Number(monthlyPass.amount),
            bankCode: req.body.bankCode,
            clientIp: getClientIp(req),
            locale: req.body.locale,
            orderInfo,
            transactionRef,
        });

        await monthlyPassService.updateMonthlyPassPaymentUrl({
            paymentId: monthlyPass.paymentId,
            paymentUrl,
            transactionRef,
        });

        return successResponse(res, "Tao lai yeu cau thanh toan thanh cong", {
            monthlyPass: {
                ...monthlyPass,
                paymentUrl,
                transactionRef,
            },
            payment: {
                id: monthlyPass.paymentId,
                transactionRef,
                amount: Number(monthlyPass.amount),
                provider: monthlyPass.paymentProvider || "VNPAY",
                paymentUrl,
            },
        });
    } catch (error) {
        return errorResponse(
            res,
            "Loi tao lai yeu cau thanh toan",
            500,
            error.message
        );
    }
};

module.exports = {
    createMyMonthlyPassPaymentUrl,
    createMonthlyPass,
    getMyMonthlyPasses,
    getMonthlyPassById,
    getMonthlyPasses,
};
