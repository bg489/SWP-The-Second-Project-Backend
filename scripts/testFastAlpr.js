const fs = require("fs");
const path = require("path");

const {
    recognizePlate,
    terminateRecognitionWorker,
} = require("../src/services/plateRecognition.service");

const imageArgument = process.argv[2];

if (!imageArgument) {
    console.error(
        "Cách dùng: npm run test:fast-alpr -- \"C:\\duong-dan\\anh-bien-so.jpg\""
    );
    process.exit(1);
}

const imagePath = path.resolve(imageArgument);
if (!fs.existsSync(imagePath)) {
    console.error(`Không tìm thấy ảnh: ${imagePath}`);
    process.exit(1);
}

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

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
