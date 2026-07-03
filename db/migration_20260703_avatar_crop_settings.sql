SET @avatar_crop_x_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_x'
);

SET @avatar_crop_x_sql := IF(
    @avatar_crop_x_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_x DECIMAL(6, 2) NOT NULL DEFAULT 50.00 AFTER avatar_url',
    'SELECT "users.avatar_crop_x already exists" AS message'
);

PREPARE avatar_crop_x_stmt FROM @avatar_crop_x_sql;
EXECUTE avatar_crop_x_stmt;
DEALLOCATE PREPARE avatar_crop_x_stmt;

SET @avatar_crop_y_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_y'
);

SET @avatar_crop_y_sql := IF(
    @avatar_crop_y_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_y DECIMAL(6, 2) NOT NULL DEFAULT 50.00 AFTER avatar_crop_x',
    'SELECT "users.avatar_crop_y already exists" AS message'
);

PREPARE avatar_crop_y_stmt FROM @avatar_crop_y_sql;
EXECUTE avatar_crop_y_stmt;
DEALLOCATE PREPARE avatar_crop_y_stmt;

SET @avatar_crop_zoom_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_zoom'
);

SET @avatar_crop_zoom_sql := IF(
    @avatar_crop_zoom_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_zoom DECIMAL(6, 2) NOT NULL DEFAULT 1.00 AFTER avatar_crop_y',
    'SELECT "users.avatar_crop_zoom already exists" AS message'
);

PREPARE avatar_crop_zoom_stmt FROM @avatar_crop_zoom_sql;
EXECUTE avatar_crop_zoom_stmt;
DEALLOCATE PREPARE avatar_crop_zoom_stmt;
