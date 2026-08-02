-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng staff_role_requests.
ALTER TABLE staff_role_requests
    ADD COLUMN request_type ENUM('PROMOTE', 'DEMOTE') NOT NULL DEFAULT 'PROMOTE'
        AFTER building_id,
    MODIFY COLUMN portrait_image_url MEDIUMTEXT NULL;

-- Giải thích: Tạo bảng staff_profiles cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS staff_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    building_id INT NOT NULL,
    portrait_image_url MEDIUMTEXT NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    approved_request_id INT NULL,
    approved_by INT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_staff_profiles_user (user_id),
    INDEX idx_staff_profiles_building_status (building_id, status),
    CONSTRAINT fk_staff_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_staff_profiles_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_staff_profiles_request
        FOREIGN KEY (approved_request_id) REFERENCES staff_role_requests(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_staff_profiles_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL
);

-- Giải thích: Bổ sung dữ liệu khởi tạo hoặc dữ liệu bù vào bảng staff_profiles.
INSERT INTO staff_profiles (
    user_id,
    building_id,
    portrait_image_url,
    status,
    approved_request_id,
    approved_by,
    started_at
)
SELECT
    request.user_id,
    request.building_id,
    request.portrait_image_url,
    'ACTIVE',
    request.id,
    request.admin_id,
    COALESCE(request.reviewed_at, request.updated_at, request.created_at)
FROM staff_role_requests request
INNER JOIN users staff ON staff.id = request.user_id
WHERE request.status = 'APPROVED'
  AND request.request_type = 'PROMOTE'
  AND request.portrait_image_url IS NOT NULL
  AND staff.role = 'STAFF'
  AND request.id = (
      SELECT MAX(latest.id)
      FROM staff_role_requests latest
      WHERE latest.user_id = request.user_id
        AND latest.status = 'APPROVED'
        AND latest.request_type = 'PROMOTE'
  )
ON DUPLICATE KEY UPDATE
    building_id = VALUES(building_id),
    portrait_image_url = VALUES(portrait_image_url),
    status = 'ACTIVE',
    approved_request_id = VALUES(approved_request_id),
    approved_by = VALUES(approved_by),
    ended_at = NULL,
    updated_at = CURRENT_TIMESTAMP;
