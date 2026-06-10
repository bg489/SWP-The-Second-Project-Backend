const crypto = require("crypto");

const DEFAULT_VNPAY_PAYMENT_URL =
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

const pad = (value) => String(value).padStart(2, "0");

const getVietnamDate = (date = new Date()) => {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;

    return new Date(utcTime + 7 * 60 * 60 * 1000);
};

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

const encode = (value) => {
    return encodeURIComponent(String(value)).replace(/%20/g, "+");
};

const sortObject = (object) => {
    return Object.keys(object)
        .sort()
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

const stringifyParams = (params) => {
    return Object.keys(params)
        .map((key) => `${encode(key)}=${encode(params[key])}`)
        .join("&");
};

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

const getVnpayConfig = () => {
    return {
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET,
        paymentUrl: process.env.VNPAY_PAYMENT_URL || DEFAULT_VNPAY_PAYMENT_URL,
        returnUrl:
            process.env.VNPAY_RETURN_URL ||
            `http://localhost:${process.env.PORT || 5000}/api/payments/vnpay-return`,
    };
};

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

const createSecureHash = (params, hashSecret) => {
    const sortedParams = sortObject(params);
    const signData = stringifyParams(sortedParams);

    return crypto
        .createHmac("sha512", hashSecret)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
};

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
    verifyReturnParams,
};
