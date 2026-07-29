USE apartment_parking_db;

CREATE TABLE IF NOT EXISTS hourly_slot_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_code VARCHAR(100) NOT NULL UNIQUE,
    customer_type ENUM('REGISTERED_USER', 'WALK_IN_GUEST') NOT NULL,
    user_id INT NULL,
    vehicle_id INT NULL,
    guest_name VARCHAR(100) NULL,
    guest_phone VARCHAR(20) NULL,
    plate_number VARCHAR(30) NOT NULL,
    building_id INT NOT NULL,
    floor_id INT NOT NULL,
    slot_id INT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    hourly_rate DECIMAL(12, 2) NOT NULL,
    reserved_hours INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('CASH', 'VNPAY') NOT NULL,
    payment_status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    status ENUM(
        'PENDING_PAYMENT',
        'BOOKED',
        'CHECKED_IN',
        'COMPLETED',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_id INT NULL,
    parking_session_id INT NULL,
    payment_expires_at DATETIME NULL,
    paid_at DATETIME NULL,
    checked_in_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_by INT NOT NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hourly_reservations_payment (payment_id),
    UNIQUE KEY uq_hourly_reservations_session (parking_session_id),
    INDEX idx_hourly_reservations_slot_time (slot_id, start_at, end_at, status),
    INDEX idx_hourly_reservations_user_status (user_id, status),
    INDEX idx_hourly_reservations_plate_status (plate_number, status),
    INDEX idx_hourly_reservations_building_status (building_id, status),
    INDEX idx_hourly_reservations_payment_expiry (status, payment_expires_at),
    CONSTRAINT fk_hourly_reservations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hourly_reservations_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hourly_reservations_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hourly_reservations_floor
        FOREIGN KEY (floor_id) REFERENCES parking_floors(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hourly_reservations_slot
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hourly_reservations_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hourly_reservations_session
        FOREIGN KEY (parking_session_id) REFERENCES parking_sessions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hourly_reservations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
);
