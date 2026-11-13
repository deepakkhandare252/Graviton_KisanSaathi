-- =============================================================================
-- Flyway V2: Additive Upgrade for Phone+OTP Auth, Verified Deadlines,
-- Reminders, In-App Notifications, and Application Snapshots
-- =============================================================================

-- 1. Extend users table for username + E.164 phone authentication (preserving legacy columns)
ALTER TABLE `users`
    MODIFY COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `username` VARCHAR(60) NULL AFTER `id`,
    ADD COLUMN IF NOT EXISTS `phone_verified` BOOLEAN NOT NULL DEFAULT FALSE AFTER `phone_number`,
    ADD COLUMN IF NOT EXISTS `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata' AFTER `preferred_language`,
    ADD COLUMN IF NOT EXISTS `sms_reminders_enabled` BOOLEAN NOT NULL DEFAULT FALSE AFTER `timezone`,
    ADD COLUMN IF NOT EXISTS `account_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION' AFTER `sms_reminders_enabled`,
    ADD COLUMN IF NOT EXISTS `terms_accepted` BOOLEAN NOT NULL DEFAULT FALSE AFTER `account_status`,
    ADD COLUMN IF NOT EXISTS `terms_accepted_at` TIMESTAMP NULL DEFAULT NULL AFTER `terms_accepted`;

CREATE UNIQUE INDEX IF NOT EXISTS `uk_users_username` ON `users` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `uk_users_phone_number` ON `users` (`phone_number`);

-- 2. Cryptographically hashed SMS OTP verifications (single-use, 5-min expiry, max 5 attempts)
CREATE TABLE IF NOT EXISTS `otp_verifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `purpose` VARCHAR(40) NOT NULL,
    `otp_hash` VARCHAR(128) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    `max_attempts` INT NOT NULL DEFAULT 5,
    `resend_count` INT NOT NULL DEFAULT 0,
    `last_sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `used_at` TIMESTAMP NULL DEFAULT NULL,
    `invalidated` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_otp_phone_purpose` (`phone_number`, `purpose`),
    INDEX `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Extend saved_schemes with snapshot, deadline & reminder settings
ALTER TABLE `saved_schemes`
    ADD COLUMN IF NOT EXISTS `scheme_name_snapshot` VARCHAR(255) NULL AFTER `scheme_id`,
    ADD COLUMN IF NOT EXISTS `application_deadline` DATE NULL AFTER `scheme_name_snapshot`,
    ADD COLUMN IF NOT EXISTS `deadline_verified` BOOLEAN NOT NULL DEFAULT FALSE AFTER `application_deadline`,
    ADD COLUMN IF NOT EXISTS `custom_deadline` DATE NULL AFTER `deadline_verified`,
    ADD COLUMN IF NOT EXISTS `reminder_enabled` BOOLEAN NOT NULL DEFAULT TRUE AFTER `custom_deadline`,
    ADD COLUMN IF NOT EXISTS `reminder_days_before` VARCHAR(64) NOT NULL DEFAULT '30,7,3,1' AFTER `reminder_enabled`,
    ADD COLUMN IF NOT EXISTS `last_reminder_sent_at` TIMESTAMP NULL DEFAULT NULL AFTER `reminder_days_before`,
    ADD COLUMN IF NOT EXISTS `reminder_acknowledged_at` TIMESTAMP NULL DEFAULT NULL AFTER `last_reminder_sent_at`,
    ADD COLUMN IF NOT EXISTS `reminder_dismissed` BOOLEAN NOT NULL DEFAULT FALSE AFTER `reminder_acknowledged_at`,
    ADD COLUMN IF NOT EXISTS `user_notes` TEXT NULL AFTER `notes`;

CREATE INDEX IF NOT EXISTS `idx_saved_deadline` ON `saved_schemes` (`application_deadline`, `reminder_enabled`);

-- 4. Extend applications with scheme/readiness/eligibility snapshots
ALTER TABLE `applications`
    ADD COLUMN IF NOT EXISTS `scheme_name_snapshot` VARCHAR(255) NULL AFTER `scheme_id`,
    ADD COLUMN IF NOT EXISTS `readiness_snapshot` INT NULL AFTER `scheme_name_snapshot`,
    ADD COLUMN IF NOT EXISTS `eligibility_snapshot` VARCHAR(40) NULL AFTER `readiness_snapshot`;

-- 5. In-app notification center records
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NULL,
    `type` VARCHAR(40) NOT NULL DEFAULT 'DEADLINE_REMINDER',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `urgency` VARCHAR(20) NOT NULL DEFAULT 'GREEN',
    `days_remaining` INT NULL,
    `channel` VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `read_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_notif_user_read` (`user_id`, `is_read`, `created_at`),
    CONSTRAINT `fk_notif_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Reminder dispatch deduplication log (prevents duplicate alerts per threshold/deadline)
CREATE TABLE IF NOT EXISTS `reminder_dispatch_logs` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NOT NULL,
    `threshold_days` INT NOT NULL,
    `target_deadline` DATE NOT NULL,
    `channel` VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    `dispatched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_reminder_dedup` (`user_id`, `scheme_id`, `threshold_days`, `target_deadline`, `channel`),
    CONSTRAINT `fk_rdl_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
