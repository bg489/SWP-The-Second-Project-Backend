const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const db = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const buildingRoutes = require("./routes/building.routes");
const floorRoutes = require("./routes/floor.routes");
const slotRoutes = require("./routes/slot.routes");
const slotRegistrationRoutes = require("./routes/slotRegistration.routes");
const paymentRoutes = require("./routes/payment.routes");
const parkingSessionRoutes = require("./routes/parkingSession.routes");
const monthlyPassRoutes = require("./routes/monthlyPass.routes");
const packagePlanRoutes = require("./routes/packagePlan.routes");
const pricingPolicyRoutes = require("./routes/pricingPolicy.routes");
const qrPassRoutes = require("./routes/qrPass.routes");
const tempQrCardRoutes = require("./routes/tempQrCard.routes");
const violationRoutes = require("./routes/violation.routes");
const violationTypeRoutes = require("./routes/violationType.routes");
const reportRoutes = require("./routes/report.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const adminUserRoutes = require("./routes/adminUser.routes");
const buildingChangeRequestRoutes = require("./routes/buildingChangeRequest.routes");
const notificationRoutes = require("./routes/notification.routes");
const wrongSlotCaseRoutes = require("./routes/wrongSlotCase.routes");
const floorMismatchCaseRoutes = require("./routes/floorMismatchCase.routes");
const {
    notFoundMiddleware,
    errorMiddleware,
} = require("./middlewares/error.middleware");
const { successResponse, errorResponse } = require("./utils/response");

const app = express();

app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
        },
    })
);

app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.get("/", (req, res) => {
    return successResponse(res, "Backend Node.js đang chạy");
});

app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS db_connected");

        return successResponse(res, "Kết nối MySQL thành công", rows[0]);
    } catch (error) {
        return errorResponse(res, "Không kết nối được MySQL", 500, error.message);
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/floors", floorRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/slot-registrations", slotRegistrationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/parking-sessions", parkingSessionRoutes);
app.use("/api/monthly-passes", monthlyPassRoutes);
app.use("/api/package-plans", packagePlanRoutes);
app.use("/api/pricing-policies", pricingPolicyRoutes);
app.use("/api/qr-passes", qrPassRoutes);
app.use("/api/temp-qr-cards", tempQrCardRoutes);
app.use("/api/violation-types", violationTypeRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/building-change-requests", buildingChangeRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/wrong-slot-cases", wrongSlotCaseRoutes);
app.use("/api/floor-mismatch-cases", floorMismatchCaseRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
