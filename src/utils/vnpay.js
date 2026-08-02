/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong vnpay.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `crypto` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/utils/vnpay.js.
 */
const crypto = require("crypto");

/**
 * Khai báo `DEFAULT_VNPAY_PAYMENT_URL` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/utils/vnpay.js.
 */
const DEFAULT_VNPAY_PAYMENT_URL =
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_PATH = "/api/payments/vnpay-return";

/**
 * Thực hiện nghiệp vụ `pad` (pad). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function pad
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const pad = (value) => String(value).padStart(2, "0");

/**
 * Lấy nghiệp vụ `getVietnamDate` (get vietnam date). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function getVietnamDate
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getVietnamDate = (date = new Date()) => {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;

    return new Date(utcTime + 7 * 60 * 60 * 1000);
};

/**
 * Chuẩn hóa hoặc chuyển đổi nghiệp vụ `formatVnpayDate` (format vnpay date). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function formatVnpayDate
 * @param {*} date - Giá trị `date` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const formatVnpayDate = (date = new Date()) => {
    const vietnamDate = getVietnamDate(date);

    return [
        vietnamDate.getFullYear(),
        pad(vietnamDate.getMonth() + 1),
        pad(vietnamDate.getDate()),
        pad(vietnamDate.getHours()),
        pad(vietnamDate.getMinutes()),
        pad(vietnamDate.getSeconds()),
    ].join("");
};

/**
 * Thực hiện nghiệp vụ `encode` (encode). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function encode
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const encode = (value) => {
    return encodeURIComponent(String(value)).replace(/%20/g, "+");
};

/**
 * Thực hiện nghiệp vụ `sortObject` (sort object). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function sortObject
 * @param {*} object - Giá trị `object` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const sortObject = (object) => {
    return Object.keys(object)
        .sort()
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .reduce((sortedObject, key) => {
            if (
                object[key] !== undefined &&
                object[key] !== null &&
                object[key] !== ""
            ) {
                sortedObject[key] = object[key];
            }

            return sortedObject;
        }, {});
};

/**
 * Thực hiện nghiệp vụ `stringifyParams` (stringify params). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function stringifyParams
 * @param {*} params - Giá trị `params` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const stringifyParams = (params) => {
    return Object.keys(params)
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        .map((key) => `${encode(key)}=${encode(params[key])}`)
        .join("&");
};

/**
 * Lấy nghiệp vụ `getClientIp` (get client ip). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function getClientIp
 * @param {*} req - Đối tượng request HTTP chứa tham số, body và thông tin đăng nhập.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return (
        req.headers["x-real-ip"] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        "127.0.0.1"
    );
};

/**
 * Thực hiện nghiệp vụ `trimTrailingSlash` (trim trailing slash). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function trimTrailingSlash
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

/**
 * Kiểm tra nghiệp vụ `isLocalUrl` (is local url). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function isLocalUrl
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isLocalUrl = (value) => {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(
        String(value || "")
    );
};

/**
 * Kiểm tra nghiệp vụ `isVnpayBackendReturnUrl` (is vnpay backend return url). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function isVnpayBackendReturnUrl
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const isVnpayBackendReturnUrl = (value) =>
    String(value || "").includes(VNPAY_RETURN_PATH);

/**
 * Tạo nghiệp vụ `buildReturnUrlFromBase` (build return url from base). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function buildReturnUrlFromBase
 * @param {*} baseUrl - Giá trị `baseUrl` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const buildReturnUrlFromBase = (baseUrl) =>
    `${trimTrailingSlash(baseUrl)}${VNPAY_RETURN_PATH}`;

/**
 * Lấy nghiệp vụ `getVnpayReturnUrl` (get vnpay return url). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function getVnpayReturnUrl
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getVnpayReturnUrl = () => {
    const configuredReturnUrl = process.env.VNPAY_RETURN_URL;
    const serverUrl = process.env.SERVER_URL;

    if (
        configuredReturnUrl &&
        isVnpayBackendReturnUrl(configuredReturnUrl) &&
        (!isLocalUrl(configuredReturnUrl) || !serverUrl || isLocalUrl(serverUrl))
    ) {
        return configuredReturnUrl;
    }

    if (serverUrl) {
        return buildReturnUrlFromBase(serverUrl);
    }

    return `http://localhost:${process.env.PORT || 5000}${VNPAY_RETURN_PATH}`;
};

/**
 * Lấy nghiệp vụ `getVnpayConfig` (get vnpay config). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function getVnpayConfig
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const getVnpayConfig = () => {
    return {
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET,
        paymentUrl: process.env.VNPAY_PAYMENT_URL || DEFAULT_VNPAY_PAYMENT_URL,
        returnUrl: getVnpayReturnUrl(),
    };
};

/**
 * Thực hiện nghiệp vụ `assertVnpayConfig` (assert vnpay config). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function assertVnpayConfig
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const assertVnpayConfig = () => {
    const config = getVnpayConfig();

    if (!config.tmnCode || !config.hashSecret) {
        const error = new Error(
            "Missing VNPAY_TMN_CODE or VNPAY_HASH_SECRET in .env"
        );
        error.statusCode = 500;
        throw error;
    }

    return config;
};

/**
 * Tạo nghiệp vụ `createSecureHash` (create secure hash). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function createSecureHash
 * @param {*} params - Giá trị `params` được hàm sử dụng trong quá trình xử lý.
 * @param {*} hashSecret - Giá trị `hashSecret` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const createSecureHash = (params, hashSecret) => {
    const sortedParams = sortObject(params);
    const signData = stringifyParams(sortedParams);

    return crypto
        .createHmac("sha512", hashSecret)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
};

/**
 * Tạo nghiệp vụ `createPaymentUrl` (create payment url). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function createPaymentUrl
 * @param {*} options - Giá trị `options` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const createPaymentUrl = ({
    amount,
    bankCode,
    clientIp,
    locale,
    orderInfo,
    orderType,
    transactionRef,
}) => {
    const config = assertVnpayConfig();
    const createDate = formatVnpayDate();
    const expireDate = formatVnpayDate(new Date(Date.now() + 15 * 60 * 1000));

    const params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: config.tmnCode,
        vnp_Locale: locale || "vn",
        vnp_CurrCode: "VND",
        vnp_TxnRef: transactionRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: orderType || "billpayment",
        vnp_Amount: Number(amount) * 100,
        vnp_ReturnUrl: config.returnUrl,
        vnp_IpAddr: clientIp || "127.0.0.1",
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
        params.vnp_BankCode = bankCode;
    }

    const sortedParams = sortObject(params);
    const secureHash = createSecureHash(sortedParams, config.hashSecret);

    return `${config.paymentUrl}?${stringifyParams(sortedParams)}&vnp_SecureHash=${secureHash}`;
};

/**
 * Kiểm tra nghiệp vụ `verifyReturnParams` (verify return params). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function verifyReturnParams
 * @param {*} query - Giá trị `query` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const verifyReturnParams = (query) => {
    const config = assertVnpayConfig();
    const receivedHash = query.vnp_SecureHash;
    const params = { ...query };

    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const secureHash = createSecureHash(params, config.hashSecret);

    return {
        isValid:
            Boolean(receivedHash) &&
            secureHash.toLowerCase() === String(receivedHash).toLowerCase(),
        secureHash,
    };
};

module.exports = {
    createPaymentUrl,
    getClientIp,
    getVnpayReturnUrl,
    verifyReturnParams,
};
