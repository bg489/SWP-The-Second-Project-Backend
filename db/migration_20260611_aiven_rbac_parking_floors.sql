-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Safe migration for existing Aiven MySQL database.
-- Run this after backing up the database and before testing RBAC/Admin/Floor APIs.

USE apartment_parking_db;

-- Temporarily allow old role values so they can be converted safely.
ALTER TABLE users
MODIFY role ENUM('ADMIN', 'PARKING_MANAGER', 'PARKING_STAFF', 'MANAGER', 'STAFF', 'USER') NOT NULL DEFAULT 'USER';

-- Giải thích: Tạm thay đổi chế độ cập nhật an toàn để migration có thể cập nhật dữ liệu theo điều kiện.
SET SQL_SAFE_UPDATES = 0;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE users
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET role = 'MANAGER'
WHERE role = 'PARKING_MANAGER';

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE users
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET role = 'STAFF'
WHERE role = 'PARKING_STAFF';

-- Add users.status only if it does not exist.
SET @users_status_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'apartment_parking_db'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'status'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql := IF(
    @users_status_exists = 0,
    'ALTER TABLE users ADD COLUMN status ENUM(''ACTIVE'', ''LOCKED'', ''INACTIVE'') NOT NULL DEFAULT ''ACTIVE'' AFTER role',
    'SELECT ''users.status already exists'' AS info'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Chuẩn hóa hoặc điền bù dữ liệu hiện có trong bảng đích.
UPDATE users
-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET status = 'ACTIVE'
WHERE status IS NULL;

-- Keep only the final role set required by the task.
ALTER TABLE users
MODIFY role ENUM('ADMIN', 'MANAGER', 'STAFF', 'USER') NOT NULL DEFAULT 'USER';

-- Floor statuses required by the task.
ALTER TABLE parking_floors
MODIFY status ENUM('ACTIVE', 'LOCKED', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- Add parking_floors.slot_count only if it does not exist.
SET @floor_slot_count_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'apartment_parking_db'
      AND TABLE_NAME = 'parking_floors'
      AND COLUMN_NAME = 'slot_count'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @sql := IF(
    @floor_slot_count_exists = 0,
    'ALTER TABLE parking_floors ADD COLUMN slot_count INT NOT NULL DEFAULT 0 AFTER capacity',
    'SELECT ''parking_floors.slot_count already exists'' AS info'
);
-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE stmt FROM @sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE stmt;

-- Giải thích: Tạm thay đổi chế độ cập nhật an toàn để migration có thể cập nhật dữ liệu theo điều kiện.
SET SQL_SAFE_UPDATES = 1;
