/**
 * @fileoverview Thực hiện nghiệp vụ và truy cập dữ liệu cho miền plateRecognition.service.
 *
 * Luồng chính: Controller truyền dữ liệu đã kiểm tra -> service thực hiện nghiệp vụ/truy vấn -> trả kết quả.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `path` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const path = require("path");
/**
 * Khai báo `readline` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const readline = require("readline");
const { spawn } = require("child_process");

/**
 * Khai báo `BACKEND_ROOT` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const BACKEND_ROOT = path.resolve(__dirname, "../..");
/**
 * Khai báo `WORKER_SCRIPT` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const WORKER_SCRIPT = path.join(BACKEND_ROOT, "src", "ai", "fast_alpr_worker.py");
/**
 * Khai báo `PYTHON_PACKAGES` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const PYTHON_PACKAGES = path.join(BACKEND_ROOT, ".python-packages");
/**
 * Khai báo `DEFAULT_MODEL_CACHE` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const DEFAULT_MODEL_CACHE = path.join(BACKEND_ROOT, ".fast-alpr-models");
/**
 * Khai báo `DEFAULT_TIMEOUT_MS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * Khai báo `DEFAULT_MIN_CONFIDENCE` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const DEFAULT_MIN_CONFIDENCE = 72;

/**
 * Khai báo `DIGIT_REPLACEMENTS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
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

/**
 * Khai báo `LETTER_REPLACEMENTS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const LETTER_REPLACEMENTS = {
    0: "O",
    1: "I",
    2: "Z",
    5: "S",
    6: "G",
    8: "B",
};

/**
 * Khai báo `workerProcess` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let workerProcess = null;
/**
 * Khai báo `workerReadyPromise` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let workerReadyPromise = null;
/**
 * Khai báo `workerReadyResolve` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let workerReadyResolve = null;
/**
 * Khai báo `workerReadyReject` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let workerReadyReject = null;
/**
 * Khai báo `workerReadyTimer` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let workerReadyTimer = null;
/**
 * Khai báo `requestSequence` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
let requestSequence = 0;
/**
 * Khai báo `pendingRequests` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/services/plateRecognition.service.js.
 */
const pendingRequests = new Map();

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `parseNumber` (parse number). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function parseNumber
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @param {*} fallback - Giá trị `fallback` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Lấy nghiệp vụ `getTimeoutMs` (get timeout ms). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getTimeoutMs
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getTimeoutMs = () =>
    Math.max(
        5000,
        parseNumber(process.env.FAST_ALPR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
    );

/**
 * Lấy nghiệp vụ `getMinimumConfidence` (get minimum confidence). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function getMinimumConfidence
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Thực hiện nghiệp vụ `toDigit` (to digit). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function toDigit
 * @param {*} character - Giá trị `character` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const toDigit = (character) =>
    /\d/.test(character) ? character : DIGIT_REPLACEMENTS[character] || "";

/**
 * Thực hiện nghiệp vụ `toLetter` (to letter). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function toLetter
 * @param {*} character - Giá trị `character` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const toLetter = (character) =>
    /[A-Z]/.test(character) ? character : LETTER_REPLACEMENTS[character] || "";

/**
 * Tạo nghiệp vụ `buildCandidate` (build candidate). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function buildCandidate
 * @param {*} source - Giá trị `source` được hàm sử dụng trong quá trình xử lý.
 * @param {*} layout - Giá trị `layout` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `formatPlateNumber` (format plate number). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function formatPlateNumber
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const formatPlateNumber = (value) => {
    const normalized = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const motorbikeMatch = normalized.match(/^(\d{2})([A-Z]\d)(\d{5})$/);
    if (motorbikeMatch) {
        const [, province, series, serial] = motorbikeMatch;
        return `${province}-${series}${serial.slice(0, 3)}.${serial.slice(3)}`;
    }

    if (/^\d{2}[A-Z]{1,2}\d{5}$/.test(normalized)) {
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

/**
 * Thực hiện nghiệp vụ `extractPlateNumber` (extract plate number). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function extractPlateNumber
 * @param {*} recognizedText - Giá trị `recognizedText` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const extractPlateNumber = (recognizedText) => {
    const source = String(recognizedText || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const layouts = ["DDLDDDDDD", "DDLLDDDDD", "DDLDDDDD"];
    const candidates = layouts
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((layout) => buildCandidate(source, layout))
        .filter(Boolean)
        /* Callback nội bộ của lời gọi `sort`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Thực hiện nghiệp vụ `rejectPendingRequests` (reject pending requests). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function rejectPendingRequests
 * @param {*} error - Giá trị `error` được hàm sử dụng trong quá trình xử lý.
 * @returns {void} Hàm hoàn tất bằng tác động lên state, response hoặc luồng xử lý hiện tại.
 */
const rejectPendingRequests = (error) => {
    /* Callback nội bộ của lời gọi `forEach`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    pendingRequests.forEach(({ reject, timer }) => {
        clearTimeout(timer);
        reject(error);
    });
    pendingRequests.clear();
};

/**
 * Xóa hoặc đặt lại nghiệp vụ `resetWorkerState` (reset worker state). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function resetWorkerState
 * @returns {void} Hàm hoàn tất bằng tác động lên state, response hoặc luồng xử lý hiện tại.
 */
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

/**
 * Thực hiện nghiệp vụ `failWorker` (fail worker). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function failWorker
 * @param {*} error - Giá trị `error` được hàm sử dụng trong quá trình xử lý.
 * @returns {void} Hàm hoàn tất bằng tác động lên state, response hoặc luồng xử lý hiện tại.
 */
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

/**
 * Xử lý nghiệp vụ `handleWorkerMessage` (handle worker message). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function handleWorkerMessage
 * @param {*} message - Giá trị `message` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

/**
 * Thực hiện nghiệp vụ `startWorker` (start worker). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function startWorker
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
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

    /* Callback nội bộ của biểu thức hiện tại; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `on`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `on`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    activeWorker.stderr.on("data", (chunk) => {
        const message = String(chunk || "").trim();
        if (message) {
            console.warn(`[FastALPR] ${message}`);
        }
    });

    /* Callback nội bộ của lời gọi `once`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    activeWorker.once("error", (error) => {
        if (activeWorker === workerProcess) {
            error.message = `Không khởi động được FastALPR bằng "${pythonBinary}": ${error.message}`;
            failWorker(error);
        }
    });

    /* Callback nội bộ của lời gọi `once`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

    /* Callback nội bộ của lời gọi `setTimeout`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Gửi nghiệp vụ `sendRecognitionRequest` (send recognition request). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function sendRecognitionRequest
 * @param {*} imageBuffer - Giá trị `imageBuffer` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const sendRecognitionRequest = async (imageBuffer) => {
    await startWorker();

    if (!workerProcess?.stdin?.writable) {
        const error = new Error("FastALPR chưa sẵn sàng.");
        error.code = "FAST_ALPR_UNAVAILABLE";
        throw error;
    }

    requestSequence += 1;
    const requestId = `plate-${Date.now()}-${requestSequence}`;

    /* Callback nội bộ của biểu thức hiện tại; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    return new Promise((resolve, reject) => {
        /* Callback nội bộ của lời gọi `setTimeout`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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
            /* Callback nội bộ của lời gọi `write`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Thực hiện nghiệp vụ `recognizePlate` (recognize plate). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function recognizePlate
 * @param {*} imageBuffer - Giá trị `imageBuffer` được hàm sử dụng trong quá trình xử lý.
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const recognizePlate = async (imageBuffer) => {
    const result = await sendRecognitionRequest(imageBuffer);
    const minimumConfidence = getMinimumConfidence();
    const candidates = (Array.isArray(result.candidates) ? result.candidates : [])
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((candidate) => ({
            ...candidate,
            plateNumber: extractPlateNumber(candidate.rawText),
        }))
        /* Callback nội bộ của lời gọi `filter`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .filter((candidate) => candidate.plateNumber);
    const selected = candidates.find(
        /* Callback nội bộ của lời gọi `find`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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

/**
 * Thực hiện nghiệp vụ `terminateRecognitionWorker` (terminate recognition worker). Hàm thực thi quy tắc nghiệp vụ và phối hợp truy vấn dữ liệu liên quan.
 *
 * @function terminateRecognitionWorker
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
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

    /* Callback nội bộ của lời gọi `setTimeout`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
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
