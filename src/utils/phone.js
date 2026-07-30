const VIETNAM_PHONE_REGEX = /^0\d{9}$/;

const normalizeOptionalPhone = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const phone = String(value).trim();
    return phone || null;
};

const isValidVietnamPhone = (value) => {
    const phone = normalizeOptionalPhone(value);
    return phone === null || VIETNAM_PHONE_REGEX.test(phone);
};

module.exports = {
    VIETNAM_PHONE_REGEX,
    isValidVietnamPhone,
    normalizeOptionalPhone,
};
