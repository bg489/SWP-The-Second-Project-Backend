-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_x_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_x'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_x_sql := IF(
    @avatar_crop_x_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_x DECIMAL(6, 2) NOT NULL DEFAULT 50.00 AFTER avatar_url',
    'SELECT "users.avatar_crop_x already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE avatar_crop_x_stmt FROM @avatar_crop_x_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE avatar_crop_x_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE avatar_crop_x_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_y_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_y'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_y_sql := IF(
    @avatar_crop_y_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_y DECIMAL(6, 2) NOT NULL DEFAULT 50.00 AFTER avatar_crop_x',
    'SELECT "users.avatar_crop_y already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE avatar_crop_y_stmt FROM @avatar_crop_y_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE avatar_crop_y_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE avatar_crop_y_stmt;

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_zoom_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'avatar_crop_zoom'
);

-- Giải thích: Lưu giá trị kiểm tra hoặc câu lệnh động vào biến phiên MySQL.
SET @avatar_crop_zoom_sql := IF(
    @avatar_crop_zoom_exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_crop_zoom DECIMAL(6, 2) NOT NULL DEFAULT 1.00 AFTER avatar_crop_y',
    'SELECT "users.avatar_crop_zoom already exists" AS message'
);

-- Giải thích: Biên dịch câu lệnh SQL động sau khi đã kiểm tra cấu trúc hiện có.
PREPARE avatar_crop_zoom_stmt FROM @avatar_crop_zoom_sql;
-- Giải thích: Thực thi câu lệnh SQL động đã chuẩn bị.
EXECUTE avatar_crop_zoom_stmt;
-- Giải thích: Giải phóng câu lệnh động sau khi thực thi xong.
DEALLOCATE PREPARE avatar_crop_zoom_stmt;
