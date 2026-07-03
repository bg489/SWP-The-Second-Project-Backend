CREATE TABLE IF NOT EXISTS profile_update_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    payload_json JSON NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_profile_update_user (user_id),
    INDEX idx_profile_update_expires (expires_at),
    CONSTRAINT fk_profile_update_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
