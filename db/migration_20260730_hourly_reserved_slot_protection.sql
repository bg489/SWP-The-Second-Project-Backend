USE apartment_parking_db;

SET @schema_name = DATABASE();

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'wrong_slot_cases'
      AND COLUMN_NAME = 'reserved_hourly_reservation_id'
);
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE wrong_slot_cases ADD COLUMN reserved_hourly_reservation_id INT NULL AFTER reserved_registration_id',
    'SELECT "wrong_slot_cases.reserved_hourly_reservation_id already exists" AS message'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'wrong_slot_cases'
      AND INDEX_NAME = 'idx_wrong_slot_cases_hourly_reservation'
);
SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX idx_wrong_slot_cases_hourly_reservation ON wrong_slot_cases(reserved_hourly_reservation_id)',
    'SELECT "idx_wrong_slot_cases_hourly_reservation already exists" AS message'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @schema_name
      AND TABLE_NAME = 'wrong_slot_cases'
      AND CONSTRAINT_NAME = 'fk_wrong_slot_cases_hourly_reservation'
);
SET @sql = IF(
    @constraint_exists = 0,
    'ALTER TABLE wrong_slot_cases ADD CONSTRAINT fk_wrong_slot_cases_hourly_reservation FOREIGN KEY (reserved_hourly_reservation_id) REFERENCES hourly_slot_reservations(id) ON DELETE SET NULL',
    'SELECT "fk_wrong_slot_cases_hourly_reservation already exists" AS message'
);
PREPARE statement FROM @sql;
EXECUTE statement;
DEALLOCATE PREPARE statement;

CREATE TABLE IF NOT EXISTS sms_outbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'ESMS',
    status ENUM('PENDING', 'SENDING', 'SENT', 'FAILED', 'PREVIEW') NOT NULL DEFAULT 'PENDING',
    provider_message_id VARCHAR(150) NULL,
    error_message VARCHAR(500) NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    related_type VARCHAR(80) NULL,
    related_id INT NULL,
    sent_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sms_outbox_delivery (status, next_attempt_at, attempt_count),
    INDEX idx_sms_outbox_related (related_type, related_id)
);
