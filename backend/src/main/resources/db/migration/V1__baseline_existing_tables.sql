-- =============================================================================
-- Flyway V1: Baseline Existing Kisan Scheme Saathi Tables (Idempotent)
-- Preserves all original tables without destroying existing records.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `preferred_language` VARCHAR(10) NOT NULL DEFAULT 'kn',
    `district` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_district` (`district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL UNIQUE,
    `expires_at` TIMESTAMP NOT NULL,
    `used_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_evt_token` (`token`),
    INDEX `idx_evt_user_id` (`user_id`),
    CONSTRAINT `fk_evt_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saved_schemes` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `saved_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_scheme` (`user_id`, `scheme_id`),
    INDEX `idx_saved_schemes_user` (`user_id`),
    INDEX `idx_saved_schemes_scheme` (`scheme_id`),
    CONSTRAINT `fk_saved_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `applications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheme_id` VARCHAR(100) NOT NULL,
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
