-- Crée le catalogue administrable des postes et rattache chaque employé à un poste.
CREATE TABLE `positions` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `positions_code_key`(`code`),
    UNIQUE INDEX `positions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catalogue initial demandé par l’entreprise.
INSERT INTO `positions` (
    `id`, `code`, `name`, `description`,
    `is_active`, `created_at`, `updated_at`
)
VALUES
    (UUID(), 'DEV_BACKEND', 'Développeur backend', 'Développement des services backend et des API.', true, NOW(3), NOW(3)),
    (UUID(), 'DEV_FRONTEND', 'Développeur frontend', 'Développement des interfaces utilisateur.', true, NOW(3), NOW(3)),
    (UUID(), 'ADMIN_SYSTEME', 'Administrateur système', 'Administration des systèmes et des plateformes.', true, NOW(3), NOW(3)),
    (UUID(), 'RESPONSABLE_RH', 'Responsable RH', 'Gestion des ressources humaines.', true, NOW(3), NOW(3)),
    (UUID(), 'CHEF_PROJET', 'Chef de projet', 'Pilotage et coordination des projets.', true, NOW(3), NOW(3)),
    (UUID(), 'RESPONSABLE_RESEAU', 'Responsable réseau', 'Administration et supervision du réseau.', true, NOW(3), NOW(3)),
    (UUID(), 'ASSISTANT_ADMINISTRATIF', 'Assistant administratif', 'Assistance aux activités administratives.', true, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
    `description` = VALUES(`description`),
    `is_active` = true,
    `updated_at` = NOW(3);

-- Conserve les intitulés personnalisés déjà utilisés dans la table employees.
INSERT INTO `positions` (
    `id`, `code`, `name`, `description`,
    `is_active`, `created_at`, `updated_at`
)
SELECT
    UUID(),
    CONCAT('LEGACY_', LEFT(MD5(legacy.`job_title`), 16)),
    legacy.`job_title`,
    'Poste importé automatiquement depuis une fiche employé existante.',
    true,
    NOW(3),
    NOW(3)
FROM (
    SELECT DISTINCT TRIM(`job_title`) AS `job_title`
    FROM `employees`
    WHERE TRIM(`job_title`) <> ''
) legacy
LEFT JOIN `positions` position_match
    ON position_match.`name` = legacy.`job_title`
WHERE position_match.`id` IS NULL;

-- Crée uniquement si nécessaire un poste de secours pour une ancienne valeur vide.
INSERT INTO `positions` (
    `id`, `code`, `name`, `description`,
    `is_active`, `created_at`, `updated_at`
)
SELECT
    UUID(),
    'LEGACY_NON_RENSEIGNE',
    'Poste non renseigné',
    'Poste de secours créé pendant la migration des anciennes fiches employés.',
    true,
    NOW(3),
    NOW(3)
WHERE EXISTS (
    SELECT 1 FROM `employees` WHERE TRIM(`job_title`) = ''
);

ALTER TABLE `employees`
    ADD COLUMN `position_id` CHAR(36) NULL;

UPDATE `employees` employee
JOIN `positions` position_match
    ON position_match.`name` = TRIM(employee.`job_title`)
SET employee.`position_id` = position_match.`id`;

UPDATE `employees`
SET `position_id` = (
    SELECT `id` FROM `positions` WHERE `code` = 'LEGACY_NON_RENSEIGNE'
)
WHERE `position_id` IS NULL;

ALTER TABLE `employees`
    MODIFY `position_id` CHAR(36) NOT NULL,
    DROP COLUMN `job_title`;

CREATE INDEX `employees_position_id_idx` ON `employees`(`position_id`);

ALTER TABLE `employees`
    ADD CONSTRAINT `employees_position_id_fkey`
    FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permissions du nouveau domaine.
INSERT INTO `permissions` (
    `id`, `code`, `name`, `description`, `category`,
    `is_active`, `created_at`, `updated_at`
)
VALUES
    (UUID(), 'positions.read', 'Consulter les postes', 'Consulte la liste et le détail des postes.', 'positions', true, NOW(3), NOW(3)),
    (UUID(), 'positions.create', 'Créer les postes', 'Crée un poste dans le catalogue.', 'positions', true, NOW(3), NOW(3)),
    (UUID(), 'positions.update', 'Modifier les postes', 'Modifie un poste du catalogue.', 'positions', true, NOW(3), NOW(3)),
    (UUID(), 'positions.deactivate', 'Désactiver les postes', 'Désactive un poste qui n’est utilisé par aucun employé actif.', 'positions', true, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `category` = VALUES(`category`),
    `is_active` = true,
    `updated_at` = NOW(3);

-- L’administrateur gère entièrement le catalogue.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT role_row.`id`, permission_row.`id`, NOW(3)
FROM `roles` role_row
JOIN `permissions` permission_row
    ON permission_row.`code` IN (
        'positions.read',
        'positions.create',
        'positions.update',
        'positions.deactivate'
    )
WHERE role_row.`name` = 'ADMINISTRATEUR';

-- Les autres rôles peuvent consulter les postes, notamment pour les formulaires employés.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT role_row.`id`, permission_row.`id`, NOW(3)
FROM `roles` role_row
JOIN `permissions` permission_row
    ON permission_row.`code` = 'positions.read'
WHERE role_row.`name` IN ('RH', 'ENCADREUR', 'DIRECTION', 'UTILISATEUR');
