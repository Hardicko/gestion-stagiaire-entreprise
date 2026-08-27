-- Conserve un compteur independant par annee pour generer les codes projet.
CREATE TABLE `project_code_sequences` (
    `year` INTEGER NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Initialise chaque compteur depuis les codes automatiques deja presents.
INSERT INTO `project_code_sequences` (
    `year`, `last_value`, `created_at`, `updated_at`
)
SELECT
    CAST(SUBSTRING(`project_code`, 5, 4) AS UNSIGNED),
    MAX(CAST(SUBSTRING_INDEX(`project_code`, '-', -1) AS UNSIGNED)),
    NOW(3),
    NOW(3)
FROM `projects`
WHERE `project_code` REGEXP '^PRJ-[0-9]{4}-[0-9]{4,}$'
GROUP BY CAST(SUBSTRING(`project_code`, 5, 4) AS UNSIGNED);
