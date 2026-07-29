const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const requirementsPath = path.join(projectRoot, "requirements.txt");
const packagesPath = path.join(projectRoot, ".python-packages");
const modelCachePath = path.join(projectRoot, ".fast-alpr-models");
const workerPath = path.join(projectRoot, "src", "ai", "fast_alpr_worker.py");

const commandCandidates = [
    process.env.FAST_ALPR_PYTHON_BIN,
    process.platform === "win32" ? "python" : "python3",
    process.platform === "win32" ? "py" : "python",
].filter(Boolean);

const supportsFastAlpr = (versionOutput) => {
    const match = String(versionOutput || "").match(/Python\s+(\d+)\.(\d+)/i);
    if (!match) {
        return false;
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    return major > 3 || (major === 3 && minor >= 10);
};

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
