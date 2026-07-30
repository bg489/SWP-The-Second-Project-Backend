const floorMismatchCaseService = require("./floorMismatchCase.service");
const wrongSlotCaseService = require("./wrongSlotCase.service");
const hourlySlotReservationService = require("./hourlySlotReservation.service");
const smsService = require("./sms.service");

const DEFAULT_INTERVAL_MS = 15000;
let workerTimer = null;
let processing = false;

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

const startViolationDeadlineWorker = () => {
    if (workerTimer) {
        return workerTimer;
    }

    const configuredInterval = Number(process.env.VIOLATION_DEADLINE_INTERVAL_MS);
    const intervalMs = Number.isFinite(configuredInterval) && configuredInterval >= 5000
        ? configuredInterval
        : DEFAULT_INTERVAL_MS;

    void processExpiredViolationCases();
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
