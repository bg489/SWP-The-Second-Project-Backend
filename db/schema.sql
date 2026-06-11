CREATE DATABASE IF NOT EXISTS apartment_parking_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE apartment_parking_db;

CREATE TABLE IF NOT EXISTS buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    floor_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    capacity INT NULL,
    slot_count INT NOT NULL DEFAULT 0,
    current_count INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'LOCKED', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parking_floors_building_name (building_id, name),
    INDEX idx_parking_floors_building_type (building_id, floor_type),
    CONSTRAINT fk_parking_floors_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_code VARCHAR(50) NOT NULL,
    status ENUM(
        'AVAILABLE',
        'RESERVED',
        'OCCUPIED',
        'MAINTENANCE',
        'LOCKED',
        'CONFLICT'
    ) NOT NULL DEFAULT 'AVAILABLE',
    size_label VARCHAR(50) NULL,
    position_description VARCHAR(255) NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_parking_slots_floor_code (floor_id, slot_code),
    INDEX idx_parking_slots_building (building_id),
    INDEX idx_parking_slots_floor_status (floor_id, status),
    CONSTRAINT fk_parking_slots_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_parking_slots_floor
        FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'MANAGER', 'STAFF', 'USER') NOT NULL DEFAULT 'USER',
    status ENUM('ACTIVE', 'LOCKED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    building_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE SET NULL
);



CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    building_id INT NULL,
    plate_number VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    brand VARCHAR(100) NULL,
    color VARCHAR(50) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vehicles_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS slot_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    building_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_id INT NOT NULL,
    registration_type ENUM('MONTHLY') NOT NULL DEFAULT 'MONTHLY',
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    start_date DATE NULL,
    end_date DATE NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slot_registrations_user (user_id),
    INDEX idx_slot_registrations_vehicle_status (vehicle_id, status),
    INDEX idx_slot_registrations_slot_status (slot_id, status),
    CONSTRAINT fk_slot_registrations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_slot_registrations_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_slot_registrations_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_slot_registrations_floor
        FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_slot_registrations_slot
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    vehicle_id INT NOT NULL,
    building_id INT NULL,
    slot_registration_id INT NULL,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_monthly_passes_vehicle_status (vehicle_id, status, start_date, end_date),
    CONSTRAINT fk_monthly_passes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_monthly_passes_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_monthly_passes_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_monthly_passes_slot_registration
        FOREIGN KEY (slot_registration_id) REFERENCES slot_registrations(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parking_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    vehicle_id INT NULL,
    building_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_id INT NULL,
    monthly_pass_id INT NULL,
    plate_number VARCHAR(30) NOT NULL,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    customer_type ENUM('REGISTERED_USER', 'WALK_IN_GUEST') NOT NULL,
    pricing_type ENUM('MONTHLY_PASS', 'TURN', 'HOURLY') NOT NULL,
    status ENUM('ACTIVE', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    check_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_at DATETIME NULL,
    base_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    violation_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_status ENUM('UNPAID', 'PENDING', 'PAID', 'WAIVED') NOT NULL DEFAULT 'UNPAID',
    payment_method ENUM('CASH', 'CARD', 'VNPAY', 'MONTHLY_PASS') NULL,
    violation_note TEXT NULL,
    paid_note TEXT NULL,
    check_in_staff_id INT NOT NULL,
    check_out_staff_id INT NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parking_sessions_status (status),
    INDEX idx_parking_sessions_plate_status (plate_number, status),
    INDEX idx_parking_sessions_vehicle_status (vehicle_id, status),
    INDEX idx_parking_sessions_slot_status (slot_id, status),
    CONSTRAINT fk_parking_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_parking_sessions_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_parking_sessions_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_parking_sessions_floor
        FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_parking_sessions_slot
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_parking_sessions_monthly_pass
        FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_parking_sessions_checkin_staff
        FOREIGN KEY (check_in_staff_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_parking_sessions_checkout_staff
        FOREIGN KEY (check_out_staff_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_registration_id INT NULL,
    parking_session_id INT NULL,
    provider ENUM('VNPAY', 'CASH', 'CARD', 'MONTHLY_PASS') NOT NULL DEFAULT 'VNPAY',
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    provider_transaction_no VARCHAR(100) NULL,
    bank_code VARCHAR(50) NULL,
    pay_date VARCHAR(14) NULL,
    response_code VARCHAR(10) NULL,
    transaction_status VARCHAR(10) NULL,
    secure_hash VARCHAR(255) NULL,
    payment_url TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payments_registration (slot_registration_id),
    INDEX idx_payments_parking_session (parking_session_id),
    INDEX idx_payments_status (status),
    CONSTRAINT fk_payments_slot_registration
        FOREIGN KEY (slot_registration_id) REFERENCES slot_registrations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_parking_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE CASCADE
);

ALTER TABLE payments
    MODIFY slot_registration_id INT NULL,
    ADD COLUMN parking_session_id INT NULL,
    MODIFY provider ENUM('VNPAY', 'CASH', 'CARD', 'MONTHLY_PASS') NOT NULL DEFAULT 'VNPAY';
