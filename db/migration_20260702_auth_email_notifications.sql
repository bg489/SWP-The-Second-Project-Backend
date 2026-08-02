-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @email_notifications_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'email_notifications_enabled'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @email_notifications_sql := IF(
    @email_notifications_exists = 0,
    'ALTER TABLE users ADD COLUMN email_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER avatar_url',
    'SELECT "users.email_notifications_enabled already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE email_notifications_stmt FROM @email_notifications_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE email_notifications_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE email_notifications_stmt;

-- Giải thích: Tạo bảng password_reset_tokens cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_user (user_id),
    INDEX idx_password_reset_token (token_hash),
    INDEX idx_password_reset_expires (expires_at),
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
