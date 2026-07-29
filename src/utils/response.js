const {
    localizeUserMessage,
    localizeUserPayload,
} = require("./userMessage");

const successResponse = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: localizeUserMessage(message),
        data: localizeUserPayload(data),
    });
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message: localizeUserMessage(message),
        errors: localizeUserPayload(errors),
    });
};

module.exports = {
    successResponse,
    errorResponse,
};
