USE apartment_parking_db;

ALTER TABLE users
    MODIFY status ENUM('PENDING', 'ACTIVE', 'LOCKED', 'INACTIVE') NOT NULL DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS package_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    duration_days INT NOT NULL DEFAULT 30,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_package_plans_vehicle_status (vehicle_type, status)
);

CREATE TABLE IF NOT EXISTS pricing_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    pricing_type ENUM('TURN', 'HOURLY') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pricing_policies_lookup (vehicle_type, pricing_type, status)
);

CREATE TABLE IF NOT EXISTS temporary_qr_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_code VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('READY', 'IN_USE', 'COMPLETED', 'LOST', 'LOCKED') NOT NULL DEFAULT 'READY',
    current_session_id INT NULL,
    issued_at DATETIME NULL,
    returned_at DATETIME NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_temporary_qr_cards_status (status),
    INDEX idx_temporary_qr_cards_session (current_session_id)
);

ALTER TABLE monthly_passes
    ADD COLUMN package_plan_id INT NULL AFTER slot_registration_id,
    MODIFY status ENUM('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    ADD CONSTRAINT fk_monthly_passes_package_plan
        FOREIGN KEY (package_plan_id) REFERENCES package_plans(id)
        ON DELETE SET NULL;

ALTER TABLE parking_sessions
    ADD COLUMN temp_qr_card_id INT NULL AFTER monthly_pass_id,
    ADD COLUMN session_qr_code VARCHAR(100) NULL AFTER temp_qr_card_id,
    ADD INDEX idx_parking_sessions_qr (session_qr_code),
    ADD CONSTRAINT fk_parking_sessions_temp_qr
        FOREIGN KEY (temp_qr_card_id) REFERENCES temporary_qr_cards(id)
        ON DELETE SET NULL;

ALTER TABLE payments
    ADD COLUMN monthly_pass_id INT NULL AFTER parking_session_id,
    ADD INDEX idx_payments_monthly_pass (monthly_pass_id),
    ADD CONSTRAINT fk_payments_monthly_pass
        FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id)
        ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS qr_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    vehicle_id INT NOT NULL,
    monthly_pass_id INT NULL,
    slot_registration_id INT NULL,
    qr_code VARCHAR(100) NOT NULL UNIQUE,
    pass_type ENUM('MONTHLY', 'SLOT_REGISTRATION') NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'LOCKED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NOT NULL,
    created_by INT NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_qr_pass_monthly (monthly_pass_id),
    UNIQUE KEY uq_qr_pass_slot_registration (slot_registration_id),
    INDEX idx_qr_passes_code_status (qr_code, status),
    INDEX idx_qr_passes_vehicle_status (vehicle_id, status),
    CONSTRAINT fk_qr_passes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_qr_passes_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_qr_passes_monthly_pass
        FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_qr_passes_slot_registration
        FOREIGN KEY (slot_registration_id) REFERENCES slot_registrations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_qr_passes_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_session_id INT NULL,
    vehicle_id INT NULL,
    plate_number VARCHAR(30) NOT NULL,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    staff_id INT NOT NULL,
    note TEXT NULL,
    evidence_url TEXT NULL,
    penalty_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('OPEN', 'RESOLVED', 'COLLECTED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    collected_payment_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_violations_session_status (parking_session_id, status),
    INDEX idx_violations_plate_status (plate_number, status),
    INDEX idx_violations_vehicle_status (vehicle_id, status),
    CONSTRAINT fk_violations_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_violations_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_violations_staff
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_violations_payment
        FOREIGN KEY (collected_payment_id) REFERENCES payments(id)
        ON DELETE SET NULL
);
