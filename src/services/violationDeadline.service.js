/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền violationDeadline.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `floorMismatchCaseService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
const floorMismatchCaseService = require("./floorMismatchCase.service");
/**
 * Khai báo `wrongSlotCaseService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
const wrongSlotCaseService = require("./wrongSlotCase.service");
/**
 * Khai báo `hourlySlotReservationService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
const hourlySlotReservationService = require("./hourlySlotReservation.service");
/**
 * Khai báo `smsService` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
const smsService = require("./sms.service");

/**
 * Khai báo `DEFAULT_INTERVAL_MS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
const DEFAULT_INTERVAL_MS = 15000;
/**
 * Khai báo `workerTimer` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
let workerTimer = null;
/**
 * Khai báo `processing` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/violationDeadline.service.js.
 */
let processing = false;

/**
 * Xử lý nghiệp vụ `processExpiredViolationCases` (process expired violation cases). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function processExpiredViolationCases
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const processExpiredViolationCases = async () => {
    if (processing) {
        return;
    }

    processing = true;

    try {
        await wrongSlotCaseService.processExpiredWrongSlotCases();
        await floorMismatchCaseService.processExpiredFloorMismatchCases();
        await hourlySlotReservationService.processReservationLifecycle();
        await smsService.processPendingSms();
        await smsService.reconcileEsmsDeliveries();
    } catch (error) {
        console.error("[violation-deadline]", error.message);
    } finally {
        processing = false;
    }
};

/**
 * Thực hiện nghiệp vụ `startViolationDeadlineWorker` (start violation deadline worker). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function startViolationDeadlineWorker
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const startViolationDeadlineWorker = () => {
    if (workerTimer) {
        return workerTimer;
    }

    const configuredInterval = Number(process.env.VIOLATION_DEADLINE_INTERVAL_MS);
    const intervalMs = Number.isFinite(configuredInterval) && configuredInterval >= 5000
        ? configuredInterval
        : DEFAULT_INTERVAL_MS;

    void processExpiredViolationCases();
    /* Callback nội bộ của lời gọi `setInterval`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    workerTimer = setInterval(() => {
        void processExpiredViolationCases();
    }, intervalMs);
    workerTimer.unref?.();

    return workerTimer;
};

module.exports = {
    processExpiredViolationCases,
    startViolationDeadlineWorker,
};
