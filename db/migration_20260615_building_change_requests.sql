-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Tạo bảng building_change_requests cùng cột, chỉ mục và khóa ngoại cần thiết.
CREATE TABLE IF NOT EXISTS building_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    current_building_id INT NULL,
    requested_building_id INT NOT NULL,

    reason TEXT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',

    admin_id INT NULL,
    admin_note TEXT NULL,
    resolved_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bcr_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bcr_current_building
        FOREIGN KEY (current_building_id) REFERENCES buildings(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_bcr_requested_building
        FOREIGN KEY (requested_building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bcr_admin
        FOREIGN KEY (admin_id) REFERENCES users(id)
        ON DELETE SET NULL
);

-- Giải thích: Thực hiện một bước thay đổi dữ liệu hoặc cấu trúc của cơ sở dữ liệu.
CREATE INDEX idx_bcr_user_id ON building_change_requests(user_id);
-- Giải thích: Thực hiện một bước thay đổi dữ liệu hoặc cấu trúc của cơ sở dữ liệu.
CREATE INDEX idx_bcr_status ON building_change_requests(status);
-- Giải thích: Thực hiện một bước thay đổi dữ liệu hoặc cấu trúc của cơ sở dữ liệu.
CREATE INDEX idx_bcr_requested_building_id ON building_change_requests(requested_building_id);