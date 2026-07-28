USE apartment_parking_db;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violation_types'
      AND COLUMN_NAME = 'code'
);

SET @add_column_sql = IF(
    @column_exists = 0,
    'ALTER TABLE violation_types ADD COLUMN code VARCHAR(60) NULL AFTER id',
    'SELECT "violation_types.code already exists" AS message'
);

PREPARE stmt FROM @add_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'violation_types'
      AND INDEX_NAME = 'uq_violation_types_code'
);

SET @add_index_sql = IF(
    @index_exists = 0,
    'ALTER TABLE violation_types ADD UNIQUE KEY uq_violation_types_code (code)',
    'SELECT "uq_violation_types_code already exists" AS message'
);

PREPARE stmt FROM @add_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE violation_types
SET code = 'WRONG_SLOT'
WHERE code IS NULL
  AND name IN ('WRONG_SLOT', 'Ô tô đậu sai ô')
ORDER BY id
LIMIT 1;

UPDATE violation_types
SET code = 'MOTORBIKE_WRONG_FLOOR'
WHERE code IS NULL
  AND name IN ('Xe may vao khu oto', 'Xe máy đậu sai khu')
ORDER BY id
LIMIT 1;

UPDATE violation_types
SET code = 'CAR_WRONG_FLOOR_TOW'
WHERE code IS NULL
  AND name IN ('Keo oto do sai khu', 'Ô tô đậu sai khu')
ORDER BY id
LIMIT 1;

UPDATE IGNORE violation_types
SET name = 'Ô tô đậu sai ô'
WHERE code = 'WRONG_SLOT'
  AND name = 'WRONG_SLOT';

UPDATE IGNORE violation_types
SET name = 'Xe máy đậu sai khu'
WHERE code = 'MOTORBIKE_WRONG_FLOOR'
  AND name = 'Xe may vao khu oto';

UPDATE IGNORE violation_types
SET name = 'Ô tô đậu sai khu'
WHERE code = 'CAR_WRONG_FLOOR_TOW'
  AND name = 'Keo oto do sai khu';

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
