const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 5000;

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Parking Building Backend API",
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
                        message: { type: "string", example: "Success" },
                        data: { type: "object", nullable: true },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string", example: "Error" },
                        errors: {
                            type: "string",
                            nullable: true,
                            example: "Error detail",
                        },
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
                UserRoleUpdateRequest: {
                    type: "object",
                    required: ["role"],
                    properties: {
                        role: {
                            type: "string",
                            enum: [
                                "ADMIN",
                                "PARKING_MANAGER",
                                "PARKING_STAFF",
                                "USER",
                            ],
                            example: "PARKING_MANAGER",
                            description: "WALK_IN_GUEST is a business role without login account.",
                        },
                    },
                },
                BuildingRequest: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: { type: "string", example: "FPT Parking Building" },
                        address: { type: "string", example: "Thu Duc, HCMC" },
                    },
                },
                BuildingUpdateRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string", example: "FPT Parking Building A" },
                        address: { type: "string", example: "Thu Duc, HCMC" },
                    },
                },
                FloorRequest: {
                    type: "object",
                    required: ["name", "floorType"],
                    properties: {
                        name: { type: "string", example: "Floor 1 - Motorbike" },
                        floorType: {
                            type: "string",
                            enum: ["MOTORBIKE", "CAR"],
                            example: "MOTORBIKE",
                        },
                        capacity: {
                            type: "integer",
                            nullable: true,
                            example: 300,
                            description: "Required for MOTORBIKE floors. CAR floors use slots instead.",
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "LOCKED", "MAINTENANCE", "INACTIVE"],
                            example: "ACTIVE",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Motorbike area near main gate",
                        },
                    },
                },
                FloorUpdateRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string", example: "Floor 2 - Car" },
                        floorType: {
                            type: "string",
                            enum: ["MOTORBIKE", "CAR"],
                            example: "CAR",
                        },
                        capacity: {
                            type: "integer",
                            nullable: true,
                            example: 300,
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "LOCKED", "MAINTENANCE", "INACTIVE"],
                            example: "ACTIVE",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Car floor",
                        },
                    },
                },
                ParkingSlotRequest: {
                    type: "object",
                    required: ["slotCode"],
                    properties: {
                        slotCode: { type: "string", example: "C-01" },
                        status: {
                            type: "string",
                            enum: [
                                "AVAILABLE",
                                "RESERVED",
                                "OCCUPIED",
                                "MAINTENANCE",
                                "LOCKED",
                                "CONFLICT",
                            ],
                            example: "AVAILABLE",
                        },
                        sizeLabel: {
                            type: "string",
                            nullable: true,
                            example: "STANDARD",
                        },
                        positionDescription: {
                            type: "string",
                            nullable: true,
                            example: "Near elevator B",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Easy access slot",
                        },
                    },
                },
                ParkingSlotUpdateRequest: {
                    type: "object",
                    properties: {
                        slotCode: { type: "string", example: "C-02" },
                        status: {
                            type: "string",
                            enum: [
                                "AVAILABLE",
                                "RESERVED",
                                "OCCUPIED",
                                "MAINTENANCE",
                                "LOCKED",
                                "CONFLICT",
                            ],
                            example: "MAINTENANCE",
                        },
                        sizeLabel: {
                            type: "string",
                            nullable: true,
                            example: "LARGE",
                        },
                        positionDescription: {
                            type: "string",
                            nullable: true,
                            example: "Near column A3",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Temporarily locked for repair",
                        },
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
