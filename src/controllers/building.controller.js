const buildingService = require("../services/building.service");
const { successResponse, errorResponse } = require("../utils/response");

const createBuilding = async (req, res) => {
    try {
        const { name, address } = req.body;

        if (!name) {
            return errorResponse(res, "Tên tòa nhà không được để trống", 400);
        }

        const building = await buildingService.createBuilding({
            name,
            address,
        });

        return successResponse(res, "Tạo tòa nhà thành công", building, 201);
    } catch (error) {
        return errorResponse(res, "Lỗi tạo tòa nhà", 500, error.message);
    }
};

const getAllBuildings = async (req, res) => {
    try {
        const buildings = await buildingService.getAllBuildings();

        return successResponse(res, "Lấy danh sách tòa nhà thành công", buildings);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy danh sách tòa nhà", 500, error.message);
    }
};

const getBuildingById = async (req, res) => {
    try {
        const { id } = req.params;

        const building = await buildingService.getBuildingById(id);

        if (!building) {
            return errorResponse(res, "Không tìm thấy tòa nhà", 404);
        }

        return successResponse(res, "Lấy chi tiết tòa nhà thành công", building);
    } catch (error) {
        return errorResponse(res, "Lỗi lấy chi tiết tòa nhà", 500, error.message);
    }
};

module.exports = {
    createBuilding,
    getAllBuildings,
    getBuildingById,
};