const monthlyPassService = require("../services/monthlyPass.service");
const qrPassService = require("../services/qrPass.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const isValidDateString = (date) => {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
};

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

const getMonthlyPasses = async (req, res) => {
    try {
        const monthlyPasses = await monthlyPassService.getMonthlyPasses();

        return successResponse(res, "Lay danh sach the thang thanh cong", monthlyPasses);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach the thang", 500, error.message);
    }
};

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

module.exports = {
    createMonthlyPass,
    getMonthlyPassById,
    getMonthlyPasses,
};
