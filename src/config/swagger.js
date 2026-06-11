const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 5000;

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Parking Building Backend API",
            version: "1.2.0",
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
                                "MANAGER",
                                "STAFF",
                                "USER",
                            ],
                            example: "MANAGER",
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
                    required: ["buildingId", "name", "floorType"],
                    properties: {
                        buildingId: { type: "integer", example: 1 },
                        name: { type: "string", example: "Floor 1 - Motorbike" },
                        code: { type: "string", example: "B1", nullable: true },
                        floorType: {
                            type: "string",
                            enum: ["MOTORBIKE", "CAR"],
                            example: "MOTORBIKE",
                        },
                        capacity: {
                            type: "integer",
                            nullable: true,
                            example: 300,
                            description: "Required for MOTORBIKE floors. CAR floors use slotCount/slots instead.",
                        },
                        slotCount: {
                            type: "integer",
                            nullable: true,
                            example: 5,
                            description: "Required for CAR floors.",
                        },
                        slots: {
                            type: "array",
                            nullable: true,
                            items: { type: "string" },
                            example: ["C-101", "C-102", "C-103"],
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "LOCKED", "MAINTENANCE", "INACTIVE"],
                            example: "ACTIVE",
                        },
                        operationNote: {
                            type: "string",
                            nullable: true,
                            example: "Motorbike area near main gate",
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
                SlotRegistrationRequest: {
                    type: "object",
                    required: ["vehicleId", "slotId", "amount"],
                    properties: {
                        vehicleId: {
                            type: "integer",
                            example: 3,
                            description: "Approved CAR vehicle owned by current USER.",
                        },
                        slotId: {
                            type: "integer",
                            example: 1,
                            description: "AVAILABLE slot under a CAR floor.",
                        },
                        amount: {
                            type: "integer",
                            example: 100000,
                            description: "Sandbox VND amount. Pricing module should replace this later.",
                        },
                        bankCode: {
                            type: "string",
                            nullable: true,
                            example: "NCB",
                            description: "Optional VNPay sandbox bank code.",
                        },
                        locale: {
                            type: "string",
                            nullable: true,
                            enum: ["vn", "en"],
                            example: "vn",
                        },
                        startDate: {
                            type: "string",
                            format: "date",
                            nullable: true,
                            example: "2026-06-11",
                        },
                        endDate: {
                            type: "string",
                            format: "date",
                            nullable: true,
                            example: "2026-07-11",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Dang ky slot thang dau tien",
                        },
                    },
                },
                ParkingSessionCheckInRequest: {
                    type: "object",
                    required: ["plateNumber", "vehicleType"],
                    properties: {
                        plateNumber: {
                            type: "string",
                            example: "59A-12345",
                        },
                        vehicleType: {
                            type: "string",
                            enum: ["MOTORBIKE", "CAR"],
                            example: "CAR",
                        },
                        buildingId: {
                            type: "integer",
                            nullable: true,
                            example: 1,
                            description: "Required for MOTORBIKE check-in.",
                        },
                        floorId: {
                            type: "integer",
                            nullable: true,
                            example: 1,
                            description: "Optional MOTORBIKE floor. If omitted, first active motorbike floor is used.",
                        },
                        slotId: {
                            type: "integer",
                            nullable: true,
                            example: 1,
                            description: "Required for CAR check-in unless car has an active monthly slot registration.",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Staff check-in at main gate",
                        },
                    },
                },
                ParkingSessionCheckOutRequest: {
                    type: "object",
                    properties: {
                        violationFee: {
                            type: "integer",
                            example: 0,
                            description: "Extra fine added on exit. Monthly pass users still pay this if present.",
                        },
                        violationNote: {
                            type: "string",
                            nullable: true,
                            example: "Parked in wrong area",
                        },
                        paymentMethod: {
                            type: "string",
                            nullable: true,
                            enum: ["CASH", "CARD", "VNPAY"],
                            example: "CASH",
                            description: "Required when totalAmount > 0. Omit when monthly pass has no violation fee.",
                        },
                        paidNote: {
                            type: "string",
                            nullable: true,
                            example: "Staff confirmed cash payment",
                        },
                        bankCode: {
                            type: "string",
                            nullable: true,
                            example: "NCB",
                            description: "Optional for VNPay sandbox.",
                        },
                        locale: {
                            type: "string",
                            nullable: true,
                            enum: ["vn", "en"],
                            example: "vn",
                        },
                    },
                },
                MonthlyPassRequest: {
                    type: "object",
                    required: ["vehicleId", "startDate", "endDate"],
                    properties: {
                        vehicleId: {
                            type: "integer",
                            example: 3,
                        },
                        amount: {
                            type: "integer",
                            example: 120000,
                            description: "Manual monthly pass amount. Can be 0 for test data.",
                        },
                        startDate: {
                            type: "string",
                            format: "date",
                            example: "2026-06-11",
                        },
                        endDate: {
                            type: "string",
                            format: "date",
                            example: "2026-07-11",
                        },
                        note: {
                            type: "string",
                            nullable: true,
                            example: "Manual monthly pass for testing gate flow",
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
