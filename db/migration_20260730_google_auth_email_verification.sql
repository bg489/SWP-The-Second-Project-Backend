-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @email_verified_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'email_verified_at'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @email_verified_sql := IF(
    @email_verified_exists = 0,
    'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL',
    'SELECT "users.email_verified_at already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE email_verified_stmt FROM @email_verified_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE email_verified_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE email_verified_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @auth_provider_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'auth_provider'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @auth_provider_sql := IF(
    @auth_provider_exists = 0,
    'ALTER TABLE users ADD COLUMN auth_provider ENUM(''LOCAL'', ''GOOGLE'', ''BOTH'') NOT NULL DEFAULT ''LOCAL''',
    'SELECT "users.auth_provider already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE auth_provider_stmt FROM @auth_provider_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE auth_provider_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE auth_provider_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @google_subject_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'google_subject'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @google_subject_sql := IF(
    @google_subject_exists = 0,
    'ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) NULL',
    'SELECT "users.google_subject already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE google_subject_stmt FROM @google_subject_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE google_subject_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE google_subject_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @google_subject_index_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'uq_users_google_subject'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @google_subject_index_sql := IF(
    @google_subject_index_exists = 0,
    'ALTER TABLE users ADD UNIQUE INDEX uq_users_google_subject (google_subject)',
    'SELECT "users.google_subject index already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE google_subject_index_stmt FROM @google_subject_index_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE google_subject_index_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE google_subject_index_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @onboarding_completed_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'onboarding_completed'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @onboarding_completed_sql := IF(
    @onboarding_completed_exists = 0,
    'ALTER TABLE users ADD COLUMN onboarding_completed TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT "users.onboarding_completed already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE onboarding_completed_stmt FROM @onboarding_completed_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE onboarding_completed_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE onboarding_completed_stmt;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE users
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET email_verified_at = COALESCE(email_verified_at, created_at, CURRENT_TIMESTAMP)
WHERE email_verified_at IS NULL;

-- Giải thích: Tạo bảng email_verification_tokens cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_verification_user (user_id),
    INDEX idx_email_verification_expires (expires_at),
    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
