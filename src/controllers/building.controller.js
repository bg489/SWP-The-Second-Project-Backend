const buildingService = require("../services/building.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidId = (id) => {
    const numberId = Number(id);

    return Number.isInteger(numberId) && numberId > 0;
};

const parseRequiredMoney = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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

const getAllBuildings = async (req, res) => {
    try {
        const buildings = await buildingService.getAllBuildings();

        return successResponse(res, "Lay danh sach toa nha thanh cong", buildings);
    } catch (error) {
        return errorResponse(res, "Loi lay danh sach toa nha", 500, error.message);
    }
};

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
