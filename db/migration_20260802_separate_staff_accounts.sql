-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
-- Giải thích: Tạm thay đổi chế độ cập nhật an toàn để migration có thể cập nhật dữ liệu theo điều kiện.
SET SQL_SAFE_UPDATES = 0;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng staff_role_requests.
ALTER TABLE staff_role_requests
    DROP FOREIGN KEY fk_staff_role_requests_user;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng staff_role_requests.
ALTER TABLE staff_role_requests
    MODIFY COLUMN user_id INT NULL,
    ADD COLUMN candidate_name VARCHAR(100) NULL AFTER user_id,
    ADD COLUMN candidate_email VARCHAR(150) NULL AFTER candidate_name,
    ADD COLUMN candidate_phone VARCHAR(20) NULL AFTER candidate_email,
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER candidate_phone,
    MODIFY COLUMN request_type ENUM('CREATE_STAFF', 'PROMOTE', 'DEMOTE')
        NOT NULL DEFAULT 'CREATE_STAFF',
    ADD INDEX idx_staff_role_requests_candidate_email (candidate_email, status);

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng staff_role_requests.
ALTER TABLE staff_role_requests
    ADD CONSTRAINT fk_staff_role_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE staff_role_requests request
INNER JOIN users account ON account.id = request.user_id
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET request.candidate_name = COALESCE(request.candidate_name, account.name),
    request.candidate_email = COALESCE(request.candidate_email, account.email),
    request.candidate_phone = COALESCE(request.candidate_phone, account.phone)
WHERE request.user_id IS NOT NULL;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE staff_role_requests
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET status = 'CANCELLED',
    admin_note = COALESCE(
        admin_note,
        'Đã hủy khi tách tài khoản Staff khỏi tài khoản User'
    ),
    reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
WHERE request_type IN ('PROMOTE', 'DEMOTE')
  AND status = 'PENDING';

-- Giải thích: Tạm thay đổi chế độ cập nhật an toàn để migration có thể cập nhật dữ liệu theo điều kiện.
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
