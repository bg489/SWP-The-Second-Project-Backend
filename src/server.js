/**
 * @fileoverview Khởi tạo máy chủ Express, đăng ký middleware, route và bắt đầu lắng nghe kết nối.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `express` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const express = require("express");
/**
 * Khai báo `cors` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const cors = require("cors");
require("dotenv").config({ override: true });
/**
 * Khai báo `swaggerUi` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const swaggerUi = require("swagger-ui-express");
/**
 * Khai báo `swaggerSpec` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const swaggerSpec = require("./config/swagger");

/**
 * Khai báo `db` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const db = require("./config/db");
/**
 * Khai báo `authRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const authRoutes = require("./routes/auth.routes");
/**
 * Khai báo `userRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const userRoutes = require("./routes/user.routes");
/**
 * Khai báo `buildingRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const buildingRoutes = require("./routes/building.routes");
/**
 * Khai báo `floorRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const floorRoutes = require("./routes/floor.routes");
/**
 * Khai báo `slotRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const slotRoutes = require("./routes/slot.routes");
/**
 * Khai báo `slotRegistrationRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const slotRegistrationRoutes = require("./routes/slotRegistration.routes");
/**
 * Khai báo `paymentRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const paymentRoutes = require("./routes/payment.routes");
/**
 * Khai báo `parkingSessionRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const parkingSessionRoutes = require("./routes/parkingSession.routes");
/**
 * Khai báo `monthlyPassRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const monthlyPassRoutes = require("./routes/monthlyPass.routes");
/**
 * Khai báo `packagePlanRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const packagePlanRoutes = require("./routes/packagePlan.routes");
/**
 * Khai báo `pricingPolicyRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const pricingPolicyRoutes = require("./routes/pricingPolicy.routes");
/**
 * Khai báo `qrPassRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const qrPassRoutes = require("./routes/qrPass.routes");
/**
 * Khai báo `tempQrCardRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const tempQrCardRoutes = require("./routes/tempQrCard.routes");
/**
 * Khai báo `violationRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const violationRoutes = require("./routes/violation.routes");
/**
 * Khai báo `violationTypeRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const violationTypeRoutes = require("./routes/violationType.routes");
/**
 * Khai báo `reportRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const reportRoutes = require("./routes/report.routes");
/**
 * Khai báo `vehicleRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const vehicleRoutes = require("./routes/vehicle.routes");
/**
 * Khai báo `adminUserRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const adminUserRoutes = require("./routes/adminUser.routes");
/**
 * Khai báo `buildingChangeRequestRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const buildingChangeRequestRoutes = require("./routes/buildingChangeRequest.routes");
/**
 * Khai báo `notificationRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const notificationRoutes = require("./routes/notification.routes");
/**
 * Khai báo `wrongSlotCaseRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const wrongSlotCaseRoutes = require("./routes/wrongSlotCase.routes");
/**
 * Khai báo `floorMismatchCaseRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const floorMismatchCaseRoutes = require("./routes/floorMismatchCase.routes");
/**
 * Khai báo `staffRoleRequestRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const staffRoleRequestRoutes = require("./routes/staffRoleRequest.routes");
/**
 * Khai báo `hourlySlotReservationRoutes` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/server.js.
 */
const hourlySlotReservationRoutes = require("./routes/hourlySlotReservation.routes");
const {
    notFoundMiddleware,
    errorMiddleware,
} = require("./middlewares/error.middleware");
const { startViolationDeadlineWorker } = require("./services/violationDeadline.service");
const { successResponse, errorResponse } = require("./utils/response");

/**
 * Khai báo `app` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/server.js.
 */
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

/* Callback nội bộ của lời gọi `get`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

/* Callback nội bộ của lời gọi `get`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
app.get("/", (req, res) => {
    return successResponse(res, "Backend Node.js đang chạy");
});

/* Callback nội bộ của lời gọi `get`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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
app.use("/api/staff-role-requests", staffRoleRequestRoutes);
app.use("/api/hourly-slot-reservations", hourlySlotReservationRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

/**
 * Khai báo `PORT` để đọc cấu hình môi trường và cung cấp giá trị mặc định an toàn.
 * Phạm vi sử dụng: src/server.js.
 */
const PORT = process.env.PORT || 5000;

/* Callback nội bộ của lời gọi `listen`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy tại port ${PORT}`);
    startViolationDeadlineWorker();
});
