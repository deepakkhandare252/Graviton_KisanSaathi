-- =============================================================================
-- KISAN SCHEME SAATHI — MYSQL 8.0+ AUTHORITATIVE SCHEMA (V2 SYNCHRONIZED)
-- Phone (+91 E.164) + Username + SMS OTP Auth, Saved Schemes & Deadlines,
-- Reminders, In-App Notifications, and Farmer Application Snapshots.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `kisan_scheme_saathi`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `kisan_scheme_saathi`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL,
    `username` VARCHAR(60) NULL UNIQUE,
    `email` VARCHAR(255) NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `preferred_language` VARCHAR(10) NOT NULL DEFAULT 'kn',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `sms_reminders_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
    `account_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `terms_accepted` BOOLEAN NOT NULL DEFAULT FALSE,
    `terms_accepted_at` TIMESTAMP NULL DEFAULT NULL,
    `district` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL UNIQUE,
    `phone_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_phone` (`phone_number`),
    INDEX `idx_users_district` (`district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `saved_schemes` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NOT NULL,
    `scheme_name_snapshot` VARCHAR(255) NULL,
    `application_deadline` DATE NULL,
    `deadline_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `custom_deadline` DATE NULL,
    `reminder_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
    `reminder_days_before` VARCHAR(64) NOT NULL DEFAULT '30,7,3,1',
    `last_reminder_sent_at` TIMESTAMP NULL DEFAULT NULL,
    `reminder_acknowledged_at` TIMESTAMP NULL DEFAULT NULL,
    `reminder_dismissed` BOOLEAN NOT NULL DEFAULT FALSE,
    `notes` TEXT NULL,
    `user_notes` TEXT NULL,
    `saved_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_scheme` (`user_id`, `scheme_id`),
    INDEX `idx_saved_schemes_user` (`user_id`),
    INDEX `idx_saved_deadline` (`application_deadline`, `reminder_enabled`),
    CONSTRAINT `fk_saved_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `applications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NOT NULL,
    `scheme_name_snapshot` VARCHAR(255) NULL,
    `readiness_snapshot` INT NULL,
    `eligibility_snapshot` VARCHAR(40) NULL,
    `status` ENUM(
        'INTERESTED',
        'PREPARING',
        'READY_TO_APPLY',
        'APPLIED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'NEEDS_CORRECTION',
        'WITHDRAWN'
    ) NOT NULL DEFAULT 'INTERESTED',
    `application_date` TIMESTAMP NULL DEFAULT NULL,
    `applied_through_portal` VARCHAR(255) NULL,
    `acknowledgement_number` VARCHAR(150) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_applications_user` (`user_id`),
    INDEX `idx_applications_status` (`status`),
    CONSTRAINT `fk_applications_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `application_timeline_events` (
    `id` VARCHAR(36) NOT NULL,
    `application_id` VARCHAR(36) NOT NULL,
    `status` ENUM(
        'INTERESTED',
        'PREPARING',
        'READY_TO_APPLY',
        'APPLIED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'NEEDS_CORRECTION',
        'WITHDRAWN'
    ) NOT NULL,
    `note` TEXT NULL,
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_timeline_application` (`application_id`),
    CONSTRAINT `fk_timeline_app`
        FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Seed Demo Verified Farmer Account (basavaraj_patil / +919845012345 / Kisan@123)
INSERT INTO `users` (
    `id`, `username`, `email`, `password_hash`, `full_name`, `preferred_language`,
    `timezone`, `sms_reminders_enabled`, `account_status`, `terms_accepted`, `terms_accepted_at`,
    `district`, `phone_number`, `phone_verified`, `email_verified`, `created_at`, `updated_at`
)
VALUES (
    'usr_seed_karnataka_demo',
    'basavaraj_patil',
    NULL,
    '$2a$12$l4vOQh5qY6y9nF9zG0L9J.1E8dV4l5k1p3r5t7v9x1z3b5d7f9h1j',
    'Basavaraj Patil',
    'kn',
    'Asia/Kolkata',
    FALSE,
    'ACTIVE',
    TRUE,
    NOW(),
    'Dharwad',
    '+919845012345',
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `username` = `username`;
