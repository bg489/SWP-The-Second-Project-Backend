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
    role ENUM('USER', 'ADMIN', 'PARKING_MANAGER', 'PARKING_STAFF') NOT NULL DEFAULT 'USER',
    building_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE SET NULL
);

ALTER TABLE users
    MODIFY role ENUM('USER', 'ADMIN', 'PARKING_MANAGER', 'PARKING_STAFF') NOT NULL DEFAULT 'USER';

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
