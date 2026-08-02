USE apartment_parking_db;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

ALTER TABLE staff_role_requests
    DROP FOREIGN KEY fk_staff_role_requests_user;

ALTER TABLE staff_role_requests
    MODIFY COLUMN user_id INT NULL,
    ADD COLUMN candidate_name VARCHAR(100) NULL AFTER user_id,
    ADD COLUMN candidate_email VARCHAR(150) NULL AFTER candidate_name,
    ADD COLUMN candidate_phone VARCHAR(20) NULL AFTER candidate_email,
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER candidate_phone,
    MODIFY COLUMN request_type ENUM('CREATE_STAFF', 'PROMOTE', 'DEMOTE')
        NOT NULL DEFAULT 'CREATE_STAFF',
    ADD INDEX idx_staff_role_requests_candidate_email (candidate_email, status);

ALTER TABLE staff_role_requests
    ADD CONSTRAINT fk_staff_role_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT;

UPDATE staff_role_requests request
INNER JOIN users account ON account.id = request.user_id
SET request.candidate_name = COALESCE(request.candidate_name, account.name),
    request.candidate_email = COALESCE(request.candidate_email, account.email),
    request.candidate_phone = COALESCE(request.candidate_phone, account.phone)
WHERE request.user_id IS NOT NULL;

UPDATE staff_role_requests
SET status = 'CANCELLED',
    admin_note = COALESCE(
        admin_note,
        'Đã hủy khi tách tài khoản Staff khỏi tài khoản User'
    ),
    reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
WHERE request_type IN ('PROMOTE', 'DEMOTE')
  AND status = 'PENDING';

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
