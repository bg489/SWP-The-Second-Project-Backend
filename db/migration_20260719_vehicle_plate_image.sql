USE apartment_parking_db;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vehicles'
      AND COLUMN_NAME = 'plate_image_url'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE vehicles ADD COLUMN plate_image_url MEDIUMTEXT NULL AFTER color',
    'SELECT "vehicles.plate_image_url already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
