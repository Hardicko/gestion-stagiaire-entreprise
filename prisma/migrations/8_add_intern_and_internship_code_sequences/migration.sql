CREATE TABLE `intern_registration_code_sequences` (
    `year` INTEGER NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `internship_reference_code_sequences` (
    `year` INTEGER NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reprend les suffixes existants, y compris les anciens formats sur trois chiffres.
INSERT INTO `intern_registration_code_sequences` (
    `year`, `last_value`, `created_at`, `updated_at`
)
SELECT
    CAST(SUBSTRING(`registration_code`, 5, 4) AS UNSIGNED),
    MAX(CAST(SUBSTRING_INDEX(`registration_code`, '-', -1) AS UNSIGNED)),
    NOW(3),
    NOW(3)
FROM `interns`
WHERE `registration_code` REGEXP '^STG-[0-9]{4}-[0-9]+$'
GROUP BY CAST(SUBSTRING(`registration_code`, 5, 4) AS UNSIGNED);

INSERT INTO `internship_reference_code_sequences` (
    `year`, `last_value`, `created_at`, `updated_at`
)
SELECT
    CAST(SUBSTRING(`reference_code`, 7, 4) AS UNSIGNED),
    MAX(CAST(SUBSTRING_INDEX(`reference_code`, '-', -1) AS UNSIGNED)),
    NOW(3),
    NOW(3)
FROM `internships`
WHERE `reference_code` REGEXP '^STAGE-[0-9]{4}-[0-9]+$'
GROUP BY CAST(SUBSTRING(`reference_code`, 7, 4) AS UNSIGNED);

-- Resynchronise aussi le compteur projet avec les éventuels anciens codes à trois chiffres.
INSERT INTO `project_code_sequences` (
    `year`, `last_value`, `created_at`, `updated_at`
)
SELECT
    CAST(SUBSTRING(`project_code`, 5, 4) AS UNSIGNED),
    MAX(CAST(SUBSTRING_INDEX(`project_code`, '-', -1) AS UNSIGNED)),
    NOW(3),
    NOW(3)
FROM `projects`
WHERE `project_code` REGEXP '^PRJ-[0-9]{4}-[0-9]+$'
GROUP BY CAST(SUBSTRING(`project_code`, 5, 4) AS UNSIGNED)
ON DUPLICATE KEY UPDATE
    `last_value` = GREATEST(`last_value`, VALUES(`last_value`)),
    `updated_at` = VALUES(`updated_at`);
