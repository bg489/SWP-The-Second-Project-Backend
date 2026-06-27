USE apartment_parking_db;

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

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violations'
      AND COLUMN_NAME = 'violation_type_id'
);

SET @add_column_sql = IF(
    @column_exists = 0,
    'ALTER TABLE violations ADD COLUMN violation_type_id INT NULL AFTER vehicle_id',
    'SELECT "violation_type_id already exists" AS message'
);

PREPARE stmt FROM @add_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violations'
      AND CONSTRAINT_NAME = 'fk_violations_violation_type'
);

SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE violations ADD CONSTRAINT fk_violations_violation_type FOREIGN KEY (violation_type_id) REFERENCES violation_types(id) ON DELETE SET NULL',
    'SELECT "fk_violations_violation_type already exists" AS message'
);

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO violation_types (name, default_penalty_fee, status, description)
VALUES
    ('Đỗ sai vị trí', 50000, 'ACTIVE', 'Xe đỗ sai slot hoặc sai khu vực được phân công'),
    ('Không quẹt QR khi vào/ra', 30000, 'ACTIVE', 'Xe không thực hiện đúng quy trình check-in/check-out bằng QR'),
    ('Làm mất thẻ QR tạm', 100000, 'ACTIVE', 'Người gửi xe làm mất hoặc không trả lại QR tạm'),
    ('Gây cản trở lối đi', 70000, 'ACTIVE', 'Xe đỗ gây cản trở luồng di chuyển trong bãi');
