const reportService = require("../services/report.service");
const { successResponse, errorResponse } = require("../utils/response");

const getTrafficReport = async (req, res) => {
    try {
        const report = await reportService.getTrafficReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao luot vao ra thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao luot vao ra", 500, error.message);
    }
};

const getMotorbikeCapacityReport = async (req, res) => {
    try {
        const report = await reportService.getMotorbikeCapacityReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao suc chua xe may thanh cong", report);
    } catch (error) {
        return errorResponse(
            res,
            "Loi lay bao cao suc chua xe may",
            500,
            error.message
        );
    }
};

const getCarSlotStatusReport = async (req, res) => {
    try {
        const report = await reportService.getCarSlotStatusReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao slot oto thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao slot oto", 500, error.message);
    }
};

const getRevenueReport = async (req, res) => {
    try {
        const report = await reportService.getRevenueReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao doanh thu thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao doanh thu", 500, error.message);
    }
};

const getQrPassReport = async (req, res) => {
    try {
        const report = await reportService.getQrPassReport({
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao QR pass thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao QR pass", 500, error.message);
    }
};

const getViolationReport = async (req, res) => {
    try {
        const report = await reportService.getViolationReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao vi pham thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao vi pham", 500, error.message);
    }
};

const getFullReport = async (req, res) => {
    try {
        const report = await reportService.getFullReport({
            from: req.query.from,
            to: req.query.to,
            buildingId: req.query.buildingId,
        });

        return successResponse(res, "Lay bao cao tong hop thanh cong", report);
    } catch (error) {
        return errorResponse(res, "Loi lay bao cao tong hop", 500, error.message);
    }
};

module.exports = {
    getCarSlotStatusReport,
    getFullReport,
    getMotorbikeCapacityReport,
    getQrPassReport,
    getRevenueReport,
    getTrafficReport,
    getViolationReport,
};
