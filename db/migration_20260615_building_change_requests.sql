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

CREATE INDEX idx_bcr_user_id ON building_change_requests(user_id);
CREATE INDEX idx_bcr_status ON building_change_requests(status);
CREATE INDEX idx_bcr_requested_building_id ON building_change_requests(requested_building_id);