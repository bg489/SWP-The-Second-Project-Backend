-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @restoration_status_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'wrong_slot_cases'
      AND COLUMN_NAME = 'restoration_status'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @restoration_status_sql := IF(
    @restoration_status_exists = 0,
    'ALTER TABLE wrong_slot_cases ADD COLUMN restoration_status ENUM(''NONE'', ''TEMP_ASSIGNED'', ''WAITING_RESERVED_EXIT'', ''RESTORED'') NOT NULL DEFAULT ''NONE'' AFTER reassigned_slot_id',
    'SELECT "wrong_slot_cases.restoration_status already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE restoration_status_stmt FROM @restoration_status_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE restoration_status_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE restoration_status_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @restoration_index_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'wrong_slot_cases'
      AND INDEX_NAME = 'idx_wrong_slot_cases_restoration'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @restoration_index_sql := IF(
    @restoration_index_exists = 0,
    'CREATE INDEX idx_wrong_slot_cases_restoration ON wrong_slot_cases(restoration_status, reserved_registration_id)',
    'SELECT "idx_wrong_slot_cases_restoration already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE restoration_index_stmt FROM @restoration_index_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE restoration_index_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE restoration_index_stmt;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng wrong_slot_cases.
ALTER TABLE wrong_slot_cases
    MODIFY COLUMN status ENUM(
        'ALLOWED',
        'WAITING_USER',
        'USER_MOVED',
        'PENALIZED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'WAITING_USER';

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng floor_mismatch_cases.
ALTER TABLE floor_mismatch_cases
    MODIFY COLUMN status ENUM(
        'LOCKED_AND_PENALIZED',
        'WAITING_USER',
        'USER_MOVED',
        'TOWED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'WAITING_USER';
