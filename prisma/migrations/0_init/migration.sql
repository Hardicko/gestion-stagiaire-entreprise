-- CreateTable
CREATE TABLE `roles` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` CHAR(36) NULL,
    `updated_by_id` CHAR(36) NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    UNIQUE INDEX `departments_code_key`(`code`),
    INDEX `departments_created_by_id_idx`(`created_by_id`),
    INDEX `departments_updated_by_id_idx`(`updated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `employee_number` VARCHAR(50) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `job_title` VARCHAR(150) NOT NULL,
    `department_id` CHAR(36) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_employee_number_key`(`employee_number`),
    UNIQUE INDEX `employees_email_key`(`email`),
    INDEX `employees_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `role_id` CHAR(36) NOT NULL,
    `password_hash` TEXT NOT NULL,
    `refresh_token_hash` TEXT NULL,
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `password_changed_at` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_employee_id_key`(`employee_id`),
    INDEX `users_role_id_idx`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervisors` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervisors_employee_id_key`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorities` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NULL,
    `signing_title` VARCHAR(150) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `authorities_employee_id_key`(`employee_id`),
    INDEX `authorities_department_id_idx`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interns` (
    `id` CHAR(36) NOT NULL,
    `registration_code` VARCHAR(30) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `address` TEXT NULL,
    `school` VARCHAR(200) NOT NULL,
    `field_of_study` VARCHAR(200) NOT NULL,
    `education_level` ENUM('LICENCE', 'MASTER') NOT NULL,
    `study_year` SMALLINT NOT NULL,
    `emergency_contact_name` VARCHAR(200) NULL,
    `emergency_contact_phone` VARCHAR(30) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `interns_registration_code_key`(`registration_code`),
    UNIQUE INDEX `interns_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internships` (
    `id` CHAR(36) NOT NULL,
    `reference_code` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `internship_type` ENUM('ACADEMIC', 'PROFESSIONAL') NOT NULL,
    `monthly_allowance` DECIMAL(12, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'XOF',
    `work_location` VARCHAR(200) NOT NULL,
    `intern_id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NOT NULL,
    `supervisor_id` CHAR(36) NOT NULL,
    `authority_id` CHAR(36) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `internships_reference_code_key`(`reference_code`),
    INDEX `internships_intern_id_idx`(`intern_id`),
    INDEX `internships_department_id_idx`(`department_id`),
    INDEX `internships_supervisor_id_idx`(`supervisor_id`),
    INDEX `internships_authority_id_idx`(`authority_id`),
    INDEX `internships_status_idx`(`status`),
    INDEX `internships_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `project_code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'PLANNED',
    `department_id` CHAR(36) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_project_code_key`(`project_code`),
    INDEX `projects_department_id_idx`(`department_id`),
    INDEX `projects_status_idx`(`status`),
    INDEX `projects_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_assignments` (
    `id` CHAR(36) NOT NULL,
    `internship_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `role` VARCHAR(150) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REMOVED') NOT NULL DEFAULT 'ASSIGNED',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_assignments_project_id_idx`(`project_id`),
    INDEX `project_assignments_status_idx`(`status`),
    INDEX `project_assignments_start_date_end_date_idx`(`start_date`, `end_date`),
    UNIQUE INDEX `project_assignments_internship_id_project_id_key`(`internship_id`, `project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervisors` ADD CONSTRAINT `supervisors_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorities` ADD CONSTRAINT `authorities_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorities` ADD CONSTRAINT `authorities_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_intern_id_fkey` FOREIGN KEY (`intern_id`) REFERENCES `interns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `supervisors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_authority_id_fkey` FOREIGN KEY (`authority_id`) REFERENCES `authorities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignments` ADD CONSTRAINT `project_assignments_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignments` ADD CONSTRAINT `project_assignments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
