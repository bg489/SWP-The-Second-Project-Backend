/**
 * @fileoverview Cung cấp hằng số và hàm hỗ trợ dùng chung của backend trong userMessage.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `LEGACY_MESSAGE_REPLACEMENTS` để giữ dữ liệu hoặc cấu hình mà các hàm trong module cùng sử dụng.
 * Phạm vi sử dụng: src/utils/userMessage.js.
 */
const LEGACY_MESSAGE_REPLACEMENTS = [
    ["Chi xe oto moi dang ky vao slot cu the", "Chỉ ô tô mới được đăng ký vào ô đỗ cụ thể"],
    ["Chi slot cua tang CAR moi dang ky oto", "Chỉ ô đỗ thuộc tầng ô tô mới dùng để đăng ký ô tô"],
    ["Dang ky slot oto chi nhan goi CAR", "Đăng ký ô đỗ ô tô chỉ nhận gói dành cho ô tô"],
    ["The dang IN_USE chi co the chuyen sang COMPLETED, LOST hoac LOCKED", "Thẻ đang được sử dụng chỉ có thể chuyển sang hoàn tất, bị mất hoặc tạm khóa"],
    ["The thang nay khong cho thanh toan", "Thẻ tháng này không cho phép thanh toán"],
    ["Phien dang cho thanh toan VNPay", "Phiên đang chờ thanh toán VNPay"],
    ["Khach vang lai khong can tai khoan, dung QR/session card tam.", "Khách vãng lai không cần tài khoản, dùng thẻ QR tạm."],
    ["User can dang nhap lai de JWT token nhan role moi.", "Người dùng cần đăng nhập lại để nhận quyền mới."],
    ["Xe cua ban khong duoc doi sau 15 phut nen he thong da ghi nhan phi vi pham. Phi nay se duoc cong khi xe ra bai.", "Xe của bạn không được dời sau 15 phút nên hệ thống đã ghi nhận phí vi phạm. Phí này sẽ được cộng khi xe ra bãi."],
    ["Xe cua ban dang dau o khac voi o da ghi nhan. O nay hien chua co ai dat nen khong phat sinh phi, vui long dau dung o trong nhung lan sau.", "Xe của bạn đang đậu ở ô khác với ô đã ghi nhận. Ô này hiện chưa có ai đặt nên không phát sinh phí, vui lòng đậu đúng ô trong những lần sau."],
    ["O da dat truoc cua ban tam thoi duoc chuyen sang", "Ô đã đặt trước của bạn tạm thời được chuyển sang"],
    ["Xe chiem o da roi bai. O dang ky cua ban da duoc chuyen lai ve", "Xe chiếm ô đã rời bãi. Ô đăng ký của bạn đã được chuyển lại về"],
    ["Nhac nho dau dung o da duoc phan", "Nhắc nhở đậu đúng ô đã được phân"],
    ["Can doi xe khoi o dau da dat", "Cần dời xe khỏi ô đậu đã đặt"],
    ["Da tinh phi vi pham dau sai o", "Đã tính phí vi phạm đậu sai ô"],
    ["O dau xe cua ban da duoc doi", "Ô đậu xe của bạn đã được đổi"],
    ["Xe dau sai slot da qua thoi gian phan hoi", "Xe đậu sai ô đã quá thời gian phản hồi"],
    ["FastALPR could not read the image.", "FastALPR không thể đọc được hình ảnh."],
    ["dau dung o", "đậu đúng ô"],
    ["o khac voi o", "ô khác với ô"],
    ["o da ghi nhan", "ô đã ghi nhận"],
    ["o chi dinh", "ô chỉ định"],
    ["o dau", "ô đậu"],
    ["O oto", "Ô ô tô"],
    ["o oto", "ô ô tô"],
    ["O nay", "Ô này"],
    ["O da", "Ô đã"],
    ["O dang ky", "Ô đăng ký"],
    ["co the", "có thể"],
    ["Co the", "Có thể"],
    ["Chi co the", "Chỉ có thể"],
    ["doi cho", "dời chỗ"],
    ["ca dau sai", "trường hợp đậu sai"],
    ["Oto can dang ky slot cu the", "Ô tô cần đăng ký ô đỗ cụ thể"],
    ["Slot chua duoc dat truoc", "Ô đỗ chưa được đặt trước"],
    ["Slot da duoc dat truoc", "Ô đỗ đã được đặt trước"],
    ["Slot vua duoc nguoi khac giu cho", "Ô đỗ vừa được người khác giữ chỗ"],
    ["Ma slot da ton tai trong tang nay", "Mã ô đỗ đã tồn tại trong tầng này"],
    ["Chua qua 15 phut cho user phan hoi", "Chưa qua 15 phút chờ người dùng phản hồi"],
    ["Ca nay khong con cho xu ly", "Trường hợp này không còn chờ xử lý"],
    ["Yeu cau nay khong con o trang thai PENDING", "Yêu cầu này không còn ở trạng thái chờ duyệt"],
    ["endDate phai lon hon hoac bang startDate", "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"],
    ["startDate va endDate phai co dinh dang YYYY-MM-DD", "Ngày bắt đầu và ngày kết thúc phải có định dạng YYYY-MM-DD"],
    ["startDate phai co dinh dang YYYY-MM-DD", "Ngày bắt đầu phải có định dạng YYYY-MM-DD"],
    ["endDate phai co dinh dang YYYY-MM-DD", "Ngày kết thúc phải có định dạng YYYY-MM-DD"],
    ["amount phai la so nguyen duong hoac truyen packagePlanId", "Số tiền phải là số nguyên dương hoặc cần chọn gói tháng"],
    ["defaultPenaltyFee phai la so nguyen khong am", "Mức phạt mặc định phải là số nguyên không âm"],
    ["violationFee phai la so nguyen khong am", "Phí vi phạm phải là số nguyên không âm"],
    ["penaltyFee phai la so nguyen khong am", "Phí phạt phải là số nguyên không âm"],
    ["amount phai la so nguyen khong am", "Số tiền phải là số nguyên không âm"],
    ["price phai la so nguyen duong", "Giá tiền phải là số nguyên dương"],
    ["durationDays phai la so nguyen duong", "Số ngày sử dụng phải là số nguyên dương"],
    ["quantity phai tu 1 den 500", "Số lượng phải từ 1 đến 500"],
    ["khong duoc de trong", "không được để trống"],
    ["Khong duoc de trong", "Không được để trống"],
    ["Khong the", "Không thể"],
    ["khong hop le", "không hợp lệ"],
    ["Khong hop le", "Không hợp lệ"],
    ["Khong tim thay", "Không tìm thấy"],
    ["khong tim thay", "không tìm thấy"],
    ["Khong co quyen", "Không có quyền"],
    ["khong co quyen", "không có quyền"],
    ["khong con", "không còn"],
    ["Khong con", "Không còn"],
    ["khong khop", "không khớp"],
    ["khong thuoc", "không thuộc"],
    ["khong the", "không thể"],
    ["khong phat sinh phi", "không phát sinh phí"],
    ["khong tinh phi", "không tính phí"],
    ["khong am", "không âm"],
    ["cho thanh toan", "chờ thanh toán"],
    ["cho duyet", "chờ duyệt"],
    ["cho xu ly", "chờ xử lý"],
    ["dang cho", "đang chờ"],
    ["dang gui", "đang gửi"],
    ["dang hoat dong", "đang hoạt động"],
    ["dang mo ban", "đang mở bán"],
    ["dang phu trach", "đang phụ trách"],
    ["dang dau", "đang đậu"],
    ["dang o", "đang ở"],
    ["dang co", "đang có"],
    ["dang gan", "đang gắn"],
    ["dang nhan vao", "đang nhận vào"],
    ["dang khong", "đang không"],
    ["dang duoc", "đang được"],
    ["dang bi", "đang bị"],
    ["dang nhap", "đăng nhập"],
    ["hoat dong", "hoạt động"],
    ["o trang thai", "ở trạng thái"],
    ["o toa nha", "ở tòa nhà"],
    ["o khu", "ở khu"],
    ["dung khu", "đúng khu"],
    ["bat dau", "bắt đầu"],
    ["dat truoc", "đặt trước"],
    ["giu cho", "giữ chỗ"],
    ["cho phep", "cho phép"],
    ["doi toa nha", "đổi tòa nhà"],
    ["doi xe", "dời xe"],
    ["Tu choi", "Từ chối"],
    ["tu choi", "từ chối"],
    ["Cap nhat", "Cập nhật"],
    ["cap nhat", "cập nhật"],
    ["Dang ky", "Đăng ký"],
    ["dang ky", "đăng ký"],
    ["Thanh toan", "Thanh toán"],
    ["thanh toan", "thanh toán"],
    ["Tao", "Tạo"],
    ["tao", "tạo"],
    ["Lay", "Lấy"],
    ["lay", "lấy"],
    ["Loi", "Lỗi"],
    ["loi", "lỗi"],
    ["Duyet", "Duyệt"],
    ["duyet", "duyệt"],
    ["Gui", "Gửi"],
    ["gui", "gửi"],
    ["Xoa", "Xóa"],
    ["xoa", "xóa"],
    ["Tat", "Tắt"],
    ["tat", "tắt"],
    ["Ghi nhan", "Ghi nhận"],
    ["ghi nhan", "ghi nhận"],
    ["xac nhan", "xác nhận"],
    ["thanh cong", "thành công"],
    ["that bai", "thất bại"],
    ["chi tiet", "chi tiết"],
    ["danh sach", "danh sách"],
    ["yeu cau", "yêu cầu"],
    ["giao dich", "giao dịch"],
    ["thong bao", "thông báo"],
    ["cau hinh gia", "cấu hình giá"],
    ["bao cao", "báo cáo"],
    ["luot vao ra", "lượt vào ra"],
    ["suc chua", "sức chứa"],
    ["tong hop", "tổng hợp"],
    ["doanh thu", "doanh thu"],
    ["goi thang", "gói tháng"],
    ["mua goi", "mua gói"],
    ["the thang", "thẻ tháng"],
    ["The thang", "Thẻ tháng"],
    ["the nay", "thẻ này"],
    ["The nay", "Thẻ này"],
    ["the QR tam", "thẻ QR tạm"],
    ["QR pass", "mã QR"],
    ["slot", "ô đỗ"],
    ["Slot", "Ô đỗ"],
    ["xe may", "xe máy"],
    ["Oto", "Ô tô"],
    ["oto", "ô tô"],
    ["toa nha", "tòa nhà"],
    ["tang", "tầng"],
    ["Tang", "Tầng"],
    ["phien gui xe", "phiên gửi xe"],
    ["luot gui xe", "lượt gửi xe"],
    ["vi pham", "vi phạm"],
    ["loai", "loại"],
    ["trang thai", "trạng thái"],
    ["vai tro", "vai trò"],
    ["role user", "vai trò người dùng"],
    ["user", "người dùng"],
    ["ho so", "hồ sơ"],
    ["anh dai dien", "ảnh đại diện"],
    ["Link anh", "Đường dẫn ảnh"],
    ["link thanh toan", "liên kết thanh toán"],
    ["link", "liên kết"],
    ["admin", "quản trị viên"],
    ["Check-out", "Cho xe ra"],
    ["Chu ky", "Chữ ký"],
    ["So tien", "Số tiền"],
    ["so tien", "số tiền"],
    ["so nguyen", "số nguyên"],
    ["dinh dang", "định dạng"],
    ["hop le", "hợp lệ"],
    ["lon hon", "lớn hơn"],
    ["hoac", "hoặc"],
    ["bang", "bằng"],
    ["rieng", "riêng"],
    ["Ten", "Tên"],
    ["ten", "tên"],
    ["Ma", "Mã"],
    ["ma", "mã"],
    ["phai", "phải"],
    ["duoc", "được"],
    ["truoc", "trước"],
    ["cua", "của"],
    ["ban", "bạn"],
    ["nay", "này"],
    ["roi", "rồi"],
    ["lai", "lại"],
    ["moi", "mới"],
    ["Da", "Đã"],
    ["da", "đã"],
    ["Chua", "Chưa"],
    ["chua", "chưa"],
    ["Co", "Có"],
    ["co", "có"],
    ["Vui long", "Vui lòng"],
    ["phut", "phút"],
    ["dau", "đậu"],
    ["tai day", "tại đây"],
    ["dat", "đặt"],
    ["khoi", "khỏi"],
    ["hien", "hiện"],
    ["nen", "nên"],
    ["he thong", "hệ thống"],
    ["cong", "cộng"],
    ["Phien", "Phiên"],
    ["Ca", "Trường hợp"],
    ["Nhac nho", "Nhắc nhở"],
    ["Can", "Cần"],
    ["va", "và"],
    ["dang", "đang"],
    ["khong", "không"],
    ["Khong", "Không"],
    ["phan hoi", "phản hồi"],
    ["thoi gian", "thời gian"],
    ["xu ly", "xử lý"],
    ["su dung", "sử dụng"],
    ["chi dinh", "chỉ định"],
    ["thuc te", "thực tế"],
    ["phu trach", "phụ trách"],
    ["thuoc", "thuộc"],
    ["con trong", "còn trống"],
    ["can", "cần"],
    ["nhap", "nhập"],
    ["gia", "giá"],
    ["luot", "lượt"],
    ["gio", "giờ"],
    ["vao", "vào"],
    ["ra bai", "ra bãi"],
    ["bai", "bãi"],
    ["tinh phi", "tính phí"],
    ["phi", "phí"],
    ["khoa xe", "khóa xe"],
    ["keo xe", "kéo xe"],
    ["keo ve", "kéo về"],
    ["an toan", "an toàn"],
    ["vi tri", "vị trí"],
    ["tam thoi", "tạm thời"],
    ["dam bao", "đảm bảo"],
    ["chiem", "chiếm"],
    ["roi bai", "rời bãi"],
    ["tra lai", "trả lại"],
    ["chuyen", "chuyển"],
    ["se", "sẽ"],
    ["lien he", "liên hệ"],
    ["nhan vien", "nhân viên"],
    ["quan ly", "quản lý"],
    ["de nghi", "đề nghị"],
    ["quyen", "quyền"],
];

/**
 * Thực hiện nghiệp vụ `escapeRegExp` (escape reg exp). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function escapeRegExp
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const escapeRegExp = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Thực hiện nghiệp vụ `replaceWholePhrase` (replace whole phrase). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function replaceWholePhrase
 * @param {*} message - Giá trị `message` được hàm sử dụng trong quá trình xử lý.
 * @param {*} from - Giá trị `from` được hàm sử dụng trong quá trình xử lý.
 * @param {*} to - Giá trị `to` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const replaceWholePhrase = (message, from, to) => {
    const pattern = new RegExp(
        `(^|[^A-Za-z0-9_])${escapeRegExp(from)}(?=$|[^A-Za-z0-9_])`,
        "g"
    );

    /* Callback nội bộ của lời gọi `replace`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
    return message.replace(pattern, (_, prefix) => `${prefix}${to}`);
};

/**
 * Thực hiện nghiệp vụ `localizeUserMessage` (localize user message). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function localizeUserMessage
 * @param {*} message - Giá trị `message` được hàm sử dụng trong quá trình xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const localizeUserMessage = (message) => {
    if (typeof message !== "string" || !message) {
        return message;
    }

    return LEGACY_MESSAGE_REPLACEMENTS.reduce(
        /* Callback nội bộ của lời gọi `reduce`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        (result, [from, to]) => replaceWholePhrase(result, from, to),
        message
    );
};

/**
 * Thực hiện nghiệp vụ `localizeUserPayload` (localize user payload). Hàm đóng gói một bước xử lý để các phần khác có thể tái sử dụng nhất quán.
 *
 * @function localizeUserPayload
 * @param {*} value - Giá trị đầu vào cần xử lý.
 * @returns {*} Kết quả đã được xử lý để lớp gọi tiếp tục sử dụng.
 */
const localizeUserPayload = (value) => {
    if (Array.isArray(value)) {
        return value.map(localizeUserPayload);
    }

    if (!value || typeof value !== "object" || value instanceof Date) {
        return value;
    }

    return Object.fromEntries(
        /* Callback nội bộ của lời gọi `map`; nhận dữ liệu từng bước và trả kết quả cho lời gọi bao ngoài. */
        Object.entries(value).map(([key, item]) => {
            if ((key === "message" || key === "title") && typeof item === "string") {
                return [key, localizeUserMessage(item)];
            }

            return [key, localizeUserPayload(item)];
        })
    );
};

module.exports = {
    localizeUserMessage,
    localizeUserPayload,
};
