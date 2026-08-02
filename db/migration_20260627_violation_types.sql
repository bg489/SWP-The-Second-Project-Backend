-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Tạo bảng violation_types cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS violation_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    default_penalty_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    description TEXT NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_violation_types_name (name),
    INDEX idx_violation_types_status (status),
    CONSTRAINT fk_violation_types_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violations'
      AND COLUMN_NAME = 'violation_type_id'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @add_column_sql = IF(
    @column_exists = 0,
    'ALTER TABLE violations ADD COLUMN violation_type_id INT NULL AFTER vehicle_id',
    'SELECT "violation_type_id already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @add_column_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violations'
      AND CONSTRAINT_NAME = 'fk_violations_violation_type'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE violations ADD CONSTRAINT fk_violations_violation_type FOREIGN KEY (violation_type_id) REFERENCES violation_types(id) ON DELETE SET NULL',
    'SELECT "fk_violations_violation_type already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @add_fk_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Bổ sung dữ liệu khởi tạo hoặc dữ liệu bù vào bảng violation_types.
INSERT IGNORE INTO violation_types (name, default_penalty_fee, status, description)
VALUES
    ('Đỗ sai vị trí', 50000, 'ACTIVE', 'Xe đỗ sai slot hoặc sai khu vực được phân công'),
    ('Không quẹt QR khi vào/ra', 30000, 'ACTIVE', 'Xe không thực hiện đúng quy trình check-in/check-out bằng QR'),
    ('Làm mất thẻ QR tạm', 100000, 'ACTIVE', 'Người gửi xe làm mất hoặc không trả lại QR tạm'),
    ('Gây cản trở lối đi', 70000, 'ACTIVE', 'Xe đỗ gây cản trở luồng di chuyển trong bãi');
