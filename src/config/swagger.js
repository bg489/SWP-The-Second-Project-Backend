const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 5000;

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Apartment Parking Backend API",
            version: "1.0.0",
            description: "Swagger docs for SWP Parking Building Management System backend",
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: "Local server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                SuccessResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Thành công" },
                        data: { type: "object", nullable: true },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string", example: "Có lỗi xảy ra" },
                        errors: { type: "string", nullable: true, example: "Chi tiết lỗi" },
                    },
                },
                RegisterRequest: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                        name: { type: "string", example: "Nguyen Van A" },
                        email: { type: "string", example: "user@example.com" },
                        phone: { type: "string", example: "0901234567" },
                        password: { type: "string", example: "123456" },
                        buildingId: { type: "integer", example: 1 },
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["emailOrPhone", "password"],
                    properties: {
                        emailOrPhone: { type: "string", example: "user@example.com" },
                        password: { type: "string", example: "123456" },
                    },
                },
                BuildingRequest: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: { type: "string", example: "Tòa nhà gửi xe FPT" },
                        address: { type: "string", example: "Quận 9, TP.HCM" },
                    },
                },
                VehicleRequest: {
                    type: "object",
                    required: ["plateNumber", "vehicleType"],
                    properties: {
                        plateNumber: { type: "string", example: "59A-12345" },
                        vehicleType: {
                            type: "string",
                            enum: ["MOTORBIKE", "CAR"],
                            example: "CAR",
                        },
                        brand: { type: "string", example: "Toyota" },
                        color: { type: "string", example: "White" },
                        buildingId: { type: "integer", example: 1 },
                    },
                },
            },
        },
    },
    apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;