/**
 * @fileoverview Cung cấp script vận hành testFastAlpr cho môi trường phát triển hoặc triển khai.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `fs` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: scripts/testFastAlpr.js.
 */
const fs = require("fs");
/**
 * Khai báo `path` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: scripts/testFastAlpr.js.
 */
const path = require("path");

const {
    recognizePlate,
    terminateRecognitionWorker,
} = require("../src/services/plateRecognition.service");

/**
 * Khai báo `imageArgument` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/testFastAlpr.js.
 */
const imageArgument = process.argv[2];

if (!imageArgument) {
    console.error(
        "Cách dùng: npm run test:fast-alpr -- \"C:\\duong-dan\\anh-bien-so.jpg\""
    );
    process.exit(1);
}

/**
 * Khai báo `imagePath` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: scripts/testFastAlpr.js.
 */
const imagePath = path.resolve(imageArgument);
if (!fs.existsSync(imagePath)) {
    console.error(`Không tìm thấy ảnh: ${imagePath}`);
    process.exit(1);
}

/**
 * Thực hiện nghiệp vụ `main` (main). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function main
 * @returns {Promise<*>} Promise chứa kết quả khi toàn bộ thao tác bất đồng bộ hoàn tất.
 */
const main = async () => {
    try {
        const result = await recognizePlate(fs.readFileSync(imagePath));
        console.log(JSON.stringify(result, null, 2));

        if (!result.plateNumber) {
            process.exitCode = 2;
        }
    } finally {
        await terminateRecognitionWorker();
    }
};

/* Callback nội bộ của lời gọi `catch`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
