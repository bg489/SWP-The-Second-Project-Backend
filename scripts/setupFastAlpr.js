/**
 * @fileoverview Cung cấp script vận hành setupFastAlpr cho môi trường phát triển hoặc triển khai.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `path` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Khai báo `projectRoot` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const projectRoot = path.resolve(__dirname, "..");
/**
 * Khai báo `requirementsPath` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const requirementsPath = path.join(projectRoot, "requirements.txt");
/**
 * Khai báo `packagesPath` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const packagesPath = path.join(projectRoot, ".python-packages");
/**
 * Khai báo `modelCachePath` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const modelCachePath = path.join(projectRoot, ".fast-alpr-models");
/**
 * Khai báo `workerPath` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const workerPath = path.join(projectRoot, "src", "ai", "fast_alpr_worker.py");

/**
 * Khai báo `commandCandidates` để đọc cấu hình môi trường và cung cấp giá trị mặc định an toàn.
 * Phạm vi sử dụng: scripts/setupFastAlpr.js.
 */
const commandCandidates = [
    process.env.FAST_ALPR_PYTHON_BIN,
    process.platform === "win32" ? "python" : "python3",
    process.platform === "win32" ? "py" : "python",
].filter(Boolean);

/**
 * Thực hiện nghiệp vụ `supportsFastAlpr` (supports fast alpr). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function supportsFastAlpr
 * @param {*} versionOutput - Giá trị `versionOutput` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const supportsFastAlpr = (versionOutput) => {
    const match = String(versionOutput || "").match(/Python\s+(\d+)\.(\d+)/i);
    if (!match) {
        return false;
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    return major > 3 || (major === 3 && minor >= 10);
};

/**
 * Lấy nghiệp vụ `findPython` (find python). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function findPython
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const findPython = () => {
    for (const command of [...new Set(commandCandidates)]) {
        const result = spawnSync(command, ["--version"], {
            encoding: "utf8",
            windowsHide: true,
        });
        const versionOutput = `${result.stdout || ""}${result.stderr || ""}`;

        if (result.status === 0 && supportsFastAlpr(versionOutput)) {
            return command;
        }
    }

    throw new Error(
        "Không tìm thấy Python 3.10 trở lên. Hãy cài Python rồi chạy lại lệnh."
    );
};

/**
 * Thực hiện nghiệp vụ `run` (run). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function run
 * @param {*} command - Giá trị `command` được hàm sử dụng trong quá trình xử lý.
 * @param {*} args - Giá trị `args` được hàm sử dụng trong quá trình xử lý.
 * @param {*} extraEnv - Giá trị `extraEnv` được hàm sử dụng trong quá trình xử lý.
 * @returns {void} Hàm hoàn tất bằng tác động lên state, response hoặc luồng xử lý hiện tại.
 */
const run = (command, args, extraEnv = {}) => {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        env: {
            ...process.env,
            ...extraEnv,
        },
        stdio: "inherit",
        windowsHide: true,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${command} kết thúc với mã ${result.status}.`);
    }
};

try {
    const python = findPython();
    const pythonPath = [
        packagesPath,
        process.env.PYTHONPATH,
    ].filter(Boolean).join(path.delimiter);

    console.log(`[FastALPR] Dùng ${python} để cài thư viện.`);
    run(python, [
        "-m",
        "pip",
        "install",
        "--upgrade",
        "--target",
        packagesPath,
        "-r",
        requirementsPath,
    ]);

    console.log("[FastALPR] Tải và kiểm tra mô hình.");
    run(
        python,
        ["-u", workerPath, "--warmup"],
        {
            FAST_ALPR_MODEL_CACHE: modelCachePath,
            PYTHONPATH: pythonPath,
            PYTHONUNBUFFERED: "1",
        }
    );

    console.log("[FastALPR] Cài đặt hoàn tất.");
} catch (error) {
    console.error(`[FastALPR] Cài đặt thất bại: ${error.message}`);
    process.exitCode = 1;
}
