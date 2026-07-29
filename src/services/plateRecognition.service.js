const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const WORKER_SCRIPT = path.join(BACKEND_ROOT, "src", "ai", "fast_alpr_worker.py");
const PYTHON_PACKAGES = path.join(BACKEND_ROOT, ".python-packages");
const DEFAULT_MODEL_CACHE = path.join(BACKEND_ROOT, ".fast-alpr-models");
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MIN_CONFIDENCE = 72;

const DIGIT_REPLACEMENTS = {
    B: "8",
    D: "0",
    G: "6",
    I: "1",
    L: "1",
    O: "0",
    Q: "0",
    S: "5",
    Z: "2",
};

const LETTER_REPLACEMENTS = {
    0: "O",
    1: "I",
    2: "Z",
    5: "S",
    6: "G",
    8: "B",
};

let workerProcess = null;
let workerReadyPromise = null;
let workerReadyResolve = null;
let workerReadyReject = null;
let workerReadyTimer = null;
let requestSequence = 0;
const pendingRequests = new Map();

const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getTimeoutMs = () =>
    Math.max(
        5000,
        parseNumber(process.env.FAST_ALPR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
    );

const getMinimumConfidence = () =>
    Math.min(
        100,
        Math.max(
            0,
            parseNumber(
                process.env.FAST_ALPR_MIN_CONFIDENCE,
                DEFAULT_MIN_CONFIDENCE
            )
        )
    );

const toDigit = (character) =>
    /\d/.test(character) ? character : DIGIT_REPLACEMENTS[character] || "";

const toLetter = (character) =>
    /[A-Z]/.test(character) ? character : LETTER_REPLACEMENTS[character] || "";

const buildCandidate = (source, layout) => {
    if (source.length !== layout.length) {
        return null;
    }

    let value = "";
    let replacements = 0;

    for (let index = 0; index < layout.length; index += 1) {
        const original = source[index];
        const converted = layout[index] === "D"
            ? toDigit(original)
            : toLetter(original);

        if (!converted) {
            return null;
        }

        if (converted !== original) {
            replacements += 1;
        }
        value += converted;
    }

    return { replacements, value };
};

const formatPlateNumber = (value) => {
    const normalized = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    if (/^\d{2}[A-Z][A-Z0-9]?\d{5}$/.test(normalized)) {
        const serial = normalized.slice(-5);
        const prefix = normalized.slice(0, -5);
        return `${prefix}-${serial.slice(0, 3)}.${serial.slice(3)}`;
    }

    const letterNumberMatch = normalized.match(/^([A-Z]{1,4})(\d{3,6})$/);
    if (letterNumberMatch) {
        return `${letterNumberMatch[1]}-${letterNumberMatch[2]}`;
    }

    return normalized;
};

const extractPlateNumber = (recognizedText) => {
    const source = String(recognizedText || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const layouts = ["DDLDDDDDD", "DDLLDDDDD", "DDLDDDDD"];
    const candidates = layouts
        .map((layout) => buildCandidate(source, layout))
        .filter(Boolean)
        .sort((left, right) => left.replacements - right.replacements);

    if (candidates[0]) {
        return formatPlateNumber(candidates[0].value);
    }

    if (
        source.length >= 4
        && source.length <= 10
        && /[A-Z]/.test(source)
        && (source.match(/\d/g) || []).length >= 2
    ) {
        return formatPlateNumber(source);
    }

    return "";
};

const rejectPendingRequests = (error) => {
    pendingRequests.forEach(({ reject, timer }) => {
        clearTimeout(timer);
        reject(error);
    });
    pendingRequests.clear();
};

const resetWorkerState = () => {
    if (workerReadyTimer) {
        clearTimeout(workerReadyTimer);
        workerReadyTimer = null;
    }
    workerProcess = null;
    workerReadyPromise = null;
    workerReadyResolve = null;
    workerReadyReject = null;
};

const failWorker = (error) => {
    const workerError = error instanceof Error
        ? error
        : new Error(String(error || "FastALPR worker stopped."));
    workerError.code = workerError.code || "FAST_ALPR_UNAVAILABLE";

    if (workerReadyReject) {
        workerReadyReject(workerError);
    }
    rejectPendingRequests(workerError);
    resetWorkerState();
};

const handleWorkerMessage = (message) => {
    if (message.type === "ready") {
        if (workerReadyTimer) {
            clearTimeout(workerReadyTimer);
            workerReadyTimer = null;
        }
        workerReadyResolve?.(message);
        workerReadyResolve = null;
        workerReadyReject = null;
        return;
    }

    if (message.type === "fatal") {
        failWorker(new Error(message.error || "FastALPR could not start."));
        return;
    }

    const pending = pendingRequests.get(message.id);
    if (!pending) {
        return;
    }

    pendingRequests.delete(message.id);
    clearTimeout(pending.timer);

    if (message.ok) {
        pending.resolve(message.result || {});
        return;
    }

    const error = new Error(message.error || "FastALPR could not read the image.");
    error.code = "FAST_ALPR_RECOGNITION_FAILED";
    pending.reject(error);
};

const startWorker = () => {
    if (workerProcess && workerReadyPromise) {
        return workerReadyPromise;
    }

    const pythonBinary = process.env.FAST_ALPR_PYTHON_BIN
        || (process.platform === "win32" ? "python" : "python3");
    const pythonPath = [
        PYTHON_PACKAGES,
        process.env.PYTHONPATH,
    ].filter(Boolean).join(path.delimiter);
    const modelCache = process.env.FAST_ALPR_MODEL_CACHE
        ? path.resolve(process.env.FAST_ALPR_MODEL_CACHE)
        : DEFAULT_MODEL_CACHE;

    workerReadyPromise = new Promise((resolve, reject) => {
        workerReadyResolve = resolve;
        workerReadyReject = reject;
    });

    workerProcess = spawn(
        pythonBinary,
        ["-u", WORKER_SCRIPT],
        {
            cwd: BACKEND_ROOT,
            env: {
                ...process.env,
                FAST_ALPR_MODEL_CACHE: modelCache,
                PYTHONPATH: pythonPath,
                PYTHONUNBUFFERED: "1",
            },
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        }
    );

    const activeWorker = workerProcess;
    const output = readline.createInterface({ input: activeWorker.stdout });

    output.on("line", (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }

        try {
            handleWorkerMessage(JSON.parse(trimmed));
        } catch (_error) {
            console.warn(`[FastALPR] ${trimmed}`);
        }
    });

    activeWorker.stderr.on("data", (chunk) => {
        const message = String(chunk || "").trim();
        if (message) {
            console.warn(`[FastALPR] ${message}`);
        }
    });

    activeWorker.once("error", (error) => {
        if (activeWorker === workerProcess) {
            error.message = `Không khởi động được FastALPR bằng "${pythonBinary}": ${error.message}`;
            failWorker(error);
        }
    });

    activeWorker.once("close", (code) => {
        output.close();
        if (activeWorker === workerProcess) {
            const error = new Error(
                `FastALPR đã dừng${code === null ? "" : ` với mã ${code}`}.`
            );
            error.code = "FAST_ALPR_UNAVAILABLE";
            failWorker(error);
        }
    });

    workerReadyTimer = setTimeout(() => {
        if (activeWorker === workerProcess) {
            activeWorker.kill();
            const error = new Error(
                "FastALPR khởi động quá lâu. Hãy kiểm tra phần cài đặt Python và mô hình."
            );
            error.code = "FAST_ALPR_UNAVAILABLE";
            failWorker(error);
        }
    }, getTimeoutMs());

    return workerReadyPromise;
};

const sendRecognitionRequest = async (imageBuffer) => {
    await startWorker();

    if (!workerProcess?.stdin?.writable) {
        const error = new Error("FastALPR chưa sẵn sàng.");
        error.code = "FAST_ALPR_UNAVAILABLE";
        throw error;
    }

    requestSequence += 1;
    const requestId = `plate-${Date.now()}-${requestSequence}`;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pendingRequests.delete(requestId);
            const error = new Error(
                "FastALPR không phản hồi kịp thời. Hãy đưa biển số gần camera hơn rồi thử lại."
            );
            error.code = "FAST_ALPR_TIMEOUT";
            reject(error);
        }, getTimeoutMs());

        pendingRequests.set(requestId, { reject, resolve, timer });
        workerProcess.stdin.write(
            `${JSON.stringify({
                id: requestId,
                image: imageBuffer.toString("base64"),
            })}\n`,
            (error) => {
                if (!error) {
                    return;
                }

                const pending = pendingRequests.get(requestId);
                if (pending) {
                    pendingRequests.delete(requestId);
                    clearTimeout(pending.timer);
                    pending.reject(error);
                }
            }
        );
    });
};

const recognizePlate = async (imageBuffer) => {
    const result = await sendRecognitionRequest(imageBuffer);
    const minimumConfidence = getMinimumConfidence();
    const candidates = (Array.isArray(result.candidates) ? result.candidates : [])
        .map((candidate) => ({
            ...candidate,
            plateNumber: extractPlateNumber(candidate.rawText),
        }))
        .filter((candidate) => candidate.plateNumber);
    const selected = candidates.find(
        (candidate) => Number(candidate.confidence || 0) >= minimumConfidence
    );

    return {
        engine: "FAST_ALPR",
        plateNumber: selected?.plateNumber || "",
        rawText: selected?.rawText || result.rawText || "",
        confidence: Number(selected?.confidence || result.confidence || 0),
        detectionConfidence: Number(
            selected?.detectionConfidence || result.detectionConfidence || 0
        ),
        ocrConfidence: Number(
            selected?.ocrConfidence || result.ocrConfidence || 0
        ),
        region: selected?.region || result.region || null,
        minimumConfidence,
        needsConfirmation: !selected,
        candidates,
    };
};

const terminateRecognitionWorker = async () => {
    const activeWorker = workerProcess;
    if (!activeWorker) {
        return;
    }

    resetWorkerState();
    rejectPendingRequests(new Error("FastALPR worker is shutting down."));

    if (activeWorker.stdin.writable) {
        activeWorker.stdin.write(`${JSON.stringify({ type: "shutdown" })}\n`);
        activeWorker.stdin.end();
    }

    setTimeout(() => {
        if (!activeWorker.killed) {
            activeWorker.kill();
        }
    }, 1000).unref();
};

module.exports = {
    extractPlateNumber,
    formatPlateNumber,
    recognizePlate,
    terminateRecognitionWorker,
};
