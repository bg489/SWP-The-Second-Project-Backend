/**
 * Uploads user-facing images to Cloudinary so the database stores only a
 * durable HTTPS URL instead of a large base64 payload.
 */

const getCloudinaryConfig = () => {
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const uploadPreset = String(process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();

    if (!cloudName || !uploadPreset) {
        const error = new Error(
            "Chưa cấu hình kho lưu ảnh đại diện. Vui lòng thêm CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET."
        );
        error.statusCode = 503;
        throw error;
    }

    return { cloudName, uploadPreset };
};

const readCloudinaryError = (payload) => {
    return payload?.error?.message || "Kho lưu ảnh chưa nhận được ảnh đại diện.";
};

/**
 * Sends one validated in-memory image to an unsigned Cloudinary upload preset.
 */
const uploadAvatarImage = async ({ buffer, fileName, mimeType }) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();

    if (typeof fetch !== "function" || typeof FormData !== "function" || typeof Blob !== "function") {
        const error = new Error("Phiên bản Node.js hiện tại chưa hỗ trợ tải ảnh lên kho lưu trữ.");
        error.statusCode = 500;
        throw error;
    }

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: mimeType }), fileName || "avatar.jpg");
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        {
            method: "POST",
            body: formData,
        }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.secure_url) {
        const error = new Error(readCloudinaryError(payload));
        error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
        throw error;
    }

    const optimizedUrl = payload.secure_url.replace(
        "/upload/",
        "/upload/f_auto,q_auto,c_limit,w_1200,h_1200/"
    );

    return {
        height: payload.height || null,
        publicId: payload.public_id || null,
        url: optimizedUrl,
        width: payload.width || null,
    };
};

module.exports = {
    uploadAvatarImage,
};
