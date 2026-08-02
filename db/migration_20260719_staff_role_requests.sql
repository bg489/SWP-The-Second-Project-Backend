-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Tạo bảng staff_role_requests cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS staff_role_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manager_id INT NOT NULL,
    user_id INT NOT NULL,
    building_id INT NOT NULL,
    portrait_image_url MEDIUMTEXT NOT NULL,
    manager_note TEXT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    admin_id INT NULL,
    admin_note TEXT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_staff_role_requests_manager (manager_id, status),
    INDEX idx_staff_role_requests_user (user_id, status),
    INDEX idx_staff_role_requests_building (building_id, status),
    CONSTRAINT fk_staff_role_requests_manager
        FOREIGN KEY (manager_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_staff_role_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_staff_role_requests_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_staff_role_requests_admin
        FOREIGN KEY (admin_id) REFERENCES users(id)
        ON DELETE SET NULL
);
