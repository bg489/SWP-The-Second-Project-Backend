const tempQrCardService = require("../services/tempQrCard.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
    TEMP_QR_CARD_STATUSES,
    isValidEnumValue,
    normalizeEnum,
} = require("../utils/constants");

const isValidId = (id) => {
    const numberId = Number(id);
    return Number.isInteger(numberId) && numberId > 0;
};

const createTempQrCard = async (req, res) => {
    try {
        const cardCode =
            typeof req.body.cardCode === "string"
                ? req.body.cardCode.trim().toUpperCase()
                : "";
        const status = req.body.status ? normalizeEnum(req.body.status) : "READY";

        if (!cardCode) {
            return errorResponse(res, "cardCode khong duoc de trong", 400);
        }

        if (!isValidEnumValue(TEMP_QR_CARD_STATUSES, status)) {
            return errorResponse(res, "status the QR tam khong hop le", 400, {
                allowedStatuses: Object.values(TEMP_QR_CARD_STATUSES),
            });
        }

        const tempQrCard = await tempQrCardService.createTempQrCard({
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

const getTempQrCards = async (req, res) => {
    try {
        const status = req.query.status ? normalizeEnum(req.query.status) : undefined;

        if (status && !isValidEnumValue(TEMP_QR_CARD_STATUSES, status)) {
            return errorResponse(res, "status the QR tam khong hop le", 400, {
                allowedStatuses: Object.values(TEMP_QR_CARD_STATUSES),
            });
        }

        const tempQrCards = await tempQrCardService.getTempQrCards({ status });

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
