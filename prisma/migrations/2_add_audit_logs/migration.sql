-- Create a persistent, append-only journal for application mutations.
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `action` ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET'
    ) NOT NULL,
    `outcome` ENUM('SUCCESS', 'FAILURE') NOT NULL DEFAULT 'SUCCESS',
    `resource` VARCHAR(100) NOT NULL,
    `resource_id` CHAR(36) NULL,
    `entity_label` VARCHAR(255) NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `status_code` SMALLINT NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `audit_logs_resource_resource_id_idx`(`resource`, `resource_id`),
    INDEX `audit_logs_outcome_created_at_idx`(`outcome`, `created_at`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
    ADD CONSTRAINT `audit_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
