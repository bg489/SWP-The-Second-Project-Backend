SET @email_verified_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'email_verified_at'
);

SET @email_verified_sql := IF(
    @email_verified_exists = 0,
    'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL',
    'SELECT "users.email_verified_at already exists" AS message'
);

PREPARE email_verified_stmt FROM @email_verified_sql;
EXECUTE email_verified_stmt;
DEALLOCATE PREPARE email_verified_stmt;

SET @auth_provider_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'auth_provider'
);

SET @auth_provider_sql := IF(
    @auth_provider_exists = 0,
    'ALTER TABLE users ADD COLUMN auth_provider ENUM(''LOCAL'', ''GOOGLE'', ''BOTH'') NOT NULL DEFAULT ''LOCAL''',
    'SELECT "users.auth_provider already exists" AS message'
);

PREPARE auth_provider_stmt FROM @auth_provider_sql;
EXECUTE auth_provider_stmt;
DEALLOCATE PREPARE auth_provider_stmt;

SET @google_subject_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'google_subject'
);

SET @google_subject_sql := IF(
    @google_subject_exists = 0,
    'ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) NULL',
    'SELECT "users.google_subject already exists" AS message'
);

PREPARE google_subject_stmt FROM @google_subject_sql;
EXECUTE google_subject_stmt;
DEALLOCATE PREPARE google_subject_stmt;

SET @google_subject_index_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'uq_users_google_subject'
);

SET @google_subject_index_sql := IF(
    @google_subject_index_exists = 0,
    'ALTER TABLE users ADD UNIQUE INDEX uq_users_google_subject (google_subject)',
    'SELECT "users.google_subject index already exists" AS message'
);

PREPARE google_subject_index_stmt FROM @google_subject_index_sql;
EXECUTE google_subject_index_stmt;
DEALLOCATE PREPARE google_subject_index_stmt;

SET @onboarding_completed_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'onboarding_completed'
);

SET @onboarding_completed_sql := IF(
    @onboarding_completed_exists = 0,
    'ALTER TABLE users ADD COLUMN onboarding_completed TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT "users.onboarding_completed already exists" AS message'
);

PREPARE onboarding_completed_stmt FROM @onboarding_completed_sql;
EXECUTE onboarding_completed_stmt;
DEALLOCATE PREPARE onboarding_completed_stmt;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at, CURRENT_TIMESTAMP)
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_verification_user (user_id),
    INDEX idx_email_verification_expires (expires_at),
    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
