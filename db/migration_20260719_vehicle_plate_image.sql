-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vehicles'
      AND COLUMN_NAME = 'plate_image_url'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE vehicles ADD COLUMN plate_image_url MEDIUMTEXT NULL AFTER color',
    'SELECT ''vehicles.plate_image_url already exists'' AS message'
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
      AND TABLE_NAME = 'vehicles'
      AND COLUMN_NAME = 'vehicle_portrait_image_url'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE vehicles ADD COLUMN vehicle_portrait_image_url MEDIUMTEXT NULL AFTER plate_image_url',
    'SELECT ''vehicles.vehicle_portrait_image_url already exists'' AS message'
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
      AND TABLE_NAME = 'vehicles'
      AND COLUMN_NAME = 'vehicle_landscape_image_url'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE vehicles ADD COLUMN vehicle_landscape_image_url MEDIUMTEXT NULL AFTER vehicle_portrait_image_url',
    'SELECT ''vehicles.vehicle_landscape_image_url already exists'' AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;
