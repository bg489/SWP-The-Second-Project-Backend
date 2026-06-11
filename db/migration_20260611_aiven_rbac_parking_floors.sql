-- Safe migration for existing Aiven MySQL database.
-- Run this after backing up the database and before testing RBAC/Admin/Floor APIs.

USE apartment_parking_db;

-- Temporarily allow old role values so they can be converted safely.
ALTER TABLE users
MODIFY role ENUM('ADMIN', 'PARKING_MANAGER', 'PARKING_STAFF', 'MANAGER', 'STAFF', 'USER') NOT NULL DEFAULT 'USER';

SET SQL_SAFE_UPDATES = 0;

UPDATE users
SET role = 'MANAGER'
WHERE role = 'PARKING_MANAGER';

UPDATE users
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

SET @sql := IF(
    @users_status_exists = 0,
    'ALTER TABLE users ADD COLUMN status ENUM(''ACTIVE'', ''LOCKED'', ''INACTIVE'') NOT NULL DEFAULT ''ACTIVE'' AFTER role',
    'SELECT ''users.status already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
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

SET @sql := IF(
    @floor_slot_count_exists = 0,
    'ALTER TABLE parking_floors ADD COLUMN slot_count INT NOT NULL DEFAULT 0 AFTER capacity',
    'SELECT ''parking_floors.slot_count already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET SQL_SAFE_UPDATES = 1;
