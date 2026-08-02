-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violation_types'
      AND COLUMN_NAME = 'code'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @add_column_sql = IF(
    @column_exists = 0,
    'ALTER TABLE violation_types ADD COLUMN code VARCHAR(60) NULL AFTER id',
    'SELECT "violation_types.code already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @add_column_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violation_types'
      AND INDEX_NAME = 'uq_violation_types_code'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @add_index_sql = IF(
    @index_exists = 0,
    'ALTER TABLE violation_types ADD UNIQUE KEY uq_violation_types_code (code)',
    'SELECT "uq_violation_types_code already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @add_index_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET code = 'WRONG_SLOT'
WHERE code IS NULL
  AND name IN ('WRONG_SLOT', 'Ô tô đậu sai ô')
ORDER BY id
LIMIT 1;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET code = 'MOTORBIKE_WRONG_FLOOR'
WHERE code IS NULL
  AND name IN ('Xe may vao khu oto', 'Xe máy đậu sai khu')
ORDER BY id
LIMIT 1;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET code = 'CAR_WRONG_FLOOR_TOW'
WHERE code IS NULL
  AND name IN ('Keo oto do sai khu', 'Ô tô đậu sai khu')
ORDER BY id
LIMIT 1;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE IGNORE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET name = 'Ô tô đậu sai ô'
WHERE code = 'WRONG_SLOT'
  AND name = 'WRONG_SLOT';

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE IGNORE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET name = 'Xe máy đậu sai khu'
WHERE code = 'MOTORBIKE_WRONG_FLOOR'
  AND name = 'Xe may vao khu oto';

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE IGNORE violation_types
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET name = 'Ô tô đậu sai khu'
WHERE code = 'CAR_WRONG_FLOOR_TOW'
  AND name = 'Keo oto do sai khu';

-- Giải thích: Bổ sung dữ liệu khởi tạo hoặc dữ liệu bù vào bảng violation_types.
INSERT INTO violation_types
    (code, name, default_penalty_fee, status, description)
SELECT
    'WRONG_SLOT',
    'Ô tô đậu sai ô',
    50000,
    'ACTIVE',
    'Ô tô đậu sai ô được chỉ định hoặc chiếm ô đã được giữ'
WHERE NOT EXISTS (
    SELECT 1 FROM violation_types WHERE code = 'WRONG_SLOT'
);

-- Giải thích: Bổ sung dữ liệu khởi tạo hoặc dữ liệu bù vào bảng violation_types.
INSERT INTO violation_types
    (code, name, default_penalty_fee, status, description)
SELECT
    'MOTORBIKE_WRONG_FLOOR',
    'Xe máy đậu sai khu',
    70000,
    'ACTIVE',
    'Xe máy đi vào khu ô tô và được đưa về khu vực an toàn'
WHERE NOT EXISTS (
    SELECT 1 FROM violation_types WHERE code = 'MOTORBIKE_WRONG_FLOOR'
);

-- Giải thích: Bổ sung dữ liệu khởi tạo hoặc dữ liệu bù vào bảng violation_types.
INSERT INTO violation_types
    (code, name, default_penalty_fee, status, description)
SELECT
    'CAR_WRONG_FLOOR_TOW',
    'Ô tô đậu sai khu',
    250000,
    'ACTIVE',
    'Ô tô đi vào khu xe máy và phát sinh chi phí đưa xe về ô chỉ định'
WHERE NOT EXISTS (
    SELECT 1 FROM violation_types WHERE code = 'CAR_WRONG_FLOOR_TOW'
);
