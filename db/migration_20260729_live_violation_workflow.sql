SET @restoration_status_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'wrong_slot_cases'
      AND COLUMN_NAME = 'restoration_status'
);

SET @restoration_status_sql := IF(
    @restoration_status_exists = 0,
    'ALTER TABLE wrong_slot_cases ADD COLUMN restoration_status ENUM(''NONE'', ''TEMP_ASSIGNED'', ''WAITING_RESERVED_EXIT'', ''RESTORED'') NOT NULL DEFAULT ''NONE'' AFTER reassigned_slot_id',
    'SELECT "wrong_slot_cases.restoration_status already exists" AS message'
);

PREPARE restoration_status_stmt FROM @restoration_status_sql;
EXECUTE restoration_status_stmt;
DEALLOCATE PREPARE restoration_status_stmt;

SET @restoration_index_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'wrong_slot_cases'
      AND INDEX_NAME = 'idx_wrong_slot_cases_restoration'
);

SET @restoration_index_sql := IF(
    @restoration_index_exists = 0,
    'CREATE INDEX idx_wrong_slot_cases_restoration ON wrong_slot_cases(restoration_status, reserved_registration_id)',
    'SELECT "idx_wrong_slot_cases_restoration already exists" AS message'
);

PREPARE restoration_index_stmt FROM @restoration_index_sql;
EXECUTE restoration_index_stmt;
DEALLOCATE PREPARE restoration_index_stmt;

ALTER TABLE wrong_slot_cases
    MODIFY COLUMN status ENUM(
        'ALLOWED',
        'WAITING_USER',
        'USER_MOVED',
        'PENALIZED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'WAITING_USER';

ALTER TABLE floor_mismatch_cases
    MODIFY COLUMN status ENUM(
        'LOCKED_AND_PENALIZED',
        'WAITING_USER',
        'USER_MOVED',
        'TOWED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'WAITING_USER';
