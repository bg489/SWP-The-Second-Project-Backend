USE apartment_parking_db;

CREATE TABLE IF NOT EXISTS floor_mismatch_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_session_id INT NOT NULL,
    vehicle_id INT NULL,
    user_id INT NULL,
    building_id INT NOT NULL,
    original_floor_id INT NOT NULL,
    observed_floor_id INT NOT NULL,
    original_slot_id INT NULL,
    target_slot_id INT NULL,
    mismatch_type ENUM('MOTORBIKE_IN_CAR_FLOOR', 'CAR_IN_MOTORBIKE_FLOOR') NOT NULL,
    evidence_url MEDIUMTEXT NULL,
    note TEXT NULL,
    status ENUM('LOCKED_AND_PENALIZED', 'WAITING_USER', 'TOWED', 'CANCELLED') NOT NULL DEFAULT 'WAITING_USER',
    notify_until DATETIME NULL,
    violation_id INT NULL,
    staff_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_floor_mismatch_cases_building_status (building_id, status),
    INDEX idx_floor_mismatch_cases_session (parking_session_id),
    INDEX idx_floor_mismatch_cases_target_slot (target_slot_id),
    CONSTRAINT fk_floor_mismatch_cases_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_floor_mismatch_cases_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_floor_mismatch_cases_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_floor_mismatch_cases_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_floor_mismatch_cases_original_floor
        FOREIGN KEY (original_floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_floor_mismatch_cases_observed_floor
        FOREIGN KEY (observed_floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_floor_mismatch_cases_original_slot
        FOREIGN KEY (original_slot_id) REFERENCES parking_slots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_floor_mismatch_cases_target_slot
        FOREIGN KEY (target_slot_id) REFERENCES parking_slots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_floor_mismatch_cases_violation
        FOREIGN KEY (violation_id) REFERENCES violations(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_floor_mismatch_cases_staff
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON DELETE RESTRICT
);

ALTER TABLE floor_mismatch_cases MODIFY evidence_url MEDIUMTEXT NULL;
