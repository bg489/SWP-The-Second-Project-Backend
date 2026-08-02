-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_url'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_url MEDIUMTEXT NULL AFTER building_id',
    'SELECT "users.avatar_url already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng users.
ALTER TABLE users MODIFY avatar_url MEDIUMTEXT NULL;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricing_policies'
      AND COLUMN_NAME = 'building_id'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE pricing_policies ADD COLUMN building_id INT NULL AFTER id',
    'SELECT "pricing_policies.building_id already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricing_policies'
      AND CONSTRAINT_NAME = 'fk_pricing_policies_building'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE pricing_policies ADD CONSTRAINT fk_pricing_policies_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE',
    'SELECT "fk_pricing_policies_building already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricing_policies'
      AND INDEX_NAME = 'idx_pricing_policies_building_lookup'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX idx_pricing_policies_building_lookup ON pricing_policies(building_id, vehicle_type, pricing_type, status)',
    'SELECT "idx_pricing_policies_building_lookup already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'package_plans'
      AND COLUMN_NAME = 'building_id'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE package_plans ADD COLUMN building_id INT NULL AFTER id',
    'SELECT "package_plans.building_id already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'package_plans'
      AND CONSTRAINT_NAME = 'fk_package_plans_building'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE package_plans ADD CONSTRAINT fk_package_plans_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE',
    'SELECT "fk_package_plans_building already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'package_plans'
      AND INDEX_NAME = 'idx_package_plans_building_vehicle_status'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX idx_package_plans_building_vehicle_status ON package_plans(building_id, vehicle_type, status)',
    'SELECT "idx_package_plans_building_vehicle_status already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'temporary_qr_cards'
      AND COLUMN_NAME = 'building_id'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE temporary_qr_cards ADD COLUMN building_id INT NULL AFTER id',
    'SELECT "temporary_qr_cards.building_id already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'temporary_qr_cards'
      AND CONSTRAINT_NAME = 'fk_temporary_qr_cards_building'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE temporary_qr_cards ADD CONSTRAINT fk_temporary_qr_cards_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL',
    'SELECT "fk_temporary_qr_cards_building already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'temporary_qr_cards'
      AND INDEX_NAME = 'idx_temporary_qr_cards_building_status'
);
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX idx_temporary_qr_cards_building_status ON temporary_qr_cards(building_id, status)',
    'SELECT "idx_temporary_qr_cards_building_status already exists" AS message'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Tạo bảng user_notifications cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    evidence_url MEDIUMTEXT NULL,
    status ENUM('UNREAD', 'READ', 'ACTION_TAKEN') NOT NULL DEFAULT 'UNREAD',
    related_type VARCHAR(80) NULL,
    related_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_notifications_user_status (user_id, status),
    CONSTRAINT fk_user_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- Giải thích: Tạo bảng wrong_slot_cases cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS wrong_slot_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_session_id INT NOT NULL,
    vehicle_id INT NULL,
    user_id INT NULL,
    building_id INT NOT NULL,
    original_slot_id INT NULL,
    observed_slot_id INT NOT NULL,
    reserved_registration_id INT NULL,
    reassigned_slot_id INT NULL,
    evidence_url MEDIUMTEXT NULL,
    note TEXT NULL,
    status ENUM('ALLOWED', 'WAITING_USER', 'USER_MOVED', 'PENALIZED', 'CANCELLED') NOT NULL DEFAULT 'WAITING_USER',
    notify_until DATETIME NULL,
    violation_id INT NULL,
    staff_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wrong_slot_cases_status_deadline (status, notify_until),
    INDEX idx_wrong_slot_cases_session (parking_session_id),
    CONSTRAINT fk_wrong_slot_cases_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_wrong_slot_cases_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_wrong_slot_cases_original_slot
        FOREIGN KEY (original_slot_id) REFERENCES parking_slots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_observed_slot
        FOREIGN KEY (observed_slot_id) REFERENCES parking_slots(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_wrong_slot_cases_reserved_registration
        FOREIGN KEY (reserved_registration_id) REFERENCES slot_registrations(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_reassigned_slot
        FOREIGN KEY (reassigned_slot_id) REFERENCES parking_slots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_violation
        FOREIGN KEY (violation_id) REFERENCES violations(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_wrong_slot_cases_staff
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng user_notifications.
ALTER TABLE user_notifications MODIFY evidence_url MEDIUMTEXT NULL;
-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng wrong_slot_cases.
ALTER TABLE wrong_slot_cases MODIFY evidence_url MEDIUMTEXT NULL;
