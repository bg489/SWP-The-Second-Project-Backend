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
    status ENUM('PENDING', 'ACTIVE', 'LOCKED', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
    building_id INT NULL,
    avatar_url MEDIUMTEXT NULL,
    avatar_crop_x DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    avatar_crop_y DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    avatar_crop_zoom DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
    email_notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS staff_role_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manager_id INT NOT NULL,
    user_id INT NOT NULL,
    building_id INT NOT NULL,
    request_type ENUM('PROMOTE', 'DEMOTE') NOT NULL DEFAULT 'PROMOTE',
    portrait_image_url MEDIUMTEXT NULL,
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



CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    building_id INT NULL,
    plate_number VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    brand VARCHAR(100) NULL,
    color VARCHAR(50) NULL,
    plate_image_url MEDIUMTEXT NULL,
    vehicle_portrait_image_url MEDIUMTEXT NULL,
    vehicle_landscape_image_url MEDIUMTEXT NULL,
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

CREATE TABLE IF NOT EXISTS monthly_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    vehicle_id INT NOT NULL,
    building_id INT NULL,
    slot_registration_id INT NULL,
    package_plan_id INT NULL,
    vehicle_type ENUM('MOTORBIKE', 'CAR') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
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
        ON DELETE SET NULL,
    CONSTRAINT fk_monthly_passes_package_plan
        FOREIGN KEY (package_plan_id) REFERENCES package_plans(id)
        ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS parking_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    vehicle_id INT NULL,
    building_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_id INT NULL,
    monthly_pass_id INT NULL,
    temp_qr_card_id INT NULL,
    session_qr_code VARCHAR(100) NULL,
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
    INDEX idx_parking_sessions_qr (session_qr_code),
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
    CONSTRAINT fk_parking_sessions_temp_qr
        FOREIGN KEY (temp_qr_card_id) REFERENCES temporary_qr_cards(id)
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
    monthly_pass_id INT NULL,
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
    INDEX idx_payments_monthly_pass (monthly_pass_id),
    INDEX idx_payments_status (status),
    CONSTRAINT fk_payments_slot_registration
        FOREIGN KEY (slot_registration_id) REFERENCES slot_registrations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_parking_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_monthly_pass
        FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS violation_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    default_penalty_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    description TEXT NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_violation_types_name (name),
    INDEX idx_violation_types_status (status),
    CONSTRAINT fk_violation_types_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_session_id INT NULL,
    vehicle_id INT NULL,
    violation_type_id INT NULL,
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
    CONSTRAINT fk_violations_violation_type
        FOREIGN KEY (violation_type_id) REFERENCES violation_types(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_violations_staff
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_violations_payment
        FOREIGN KEY (collected_payment_id) REFERENCES payments(id)
        ON DELETE SET NULL
);

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
