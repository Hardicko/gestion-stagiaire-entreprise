-- CreateTable
CREATE TABLE `permissions` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    INDEX `permissions_category_code_idx`(`category`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` CHAR(36) NOT NULL,
    `permission_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions`
    ADD CONSTRAINT `role_permissions_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions`
    ADD CONSTRAINT `role_permissions_permission_id_fkey`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Les rôles de base sont créés sans créer de nouveaux comptes utilisateurs.
INSERT INTO `roles` (
    `id`, `name`, `description`, `is_active`, `created_at`, `updated_at`
)
VALUES
    (UUID(), 'ADMINISTRATEUR', 'Accès complet à l’application', true, NOW(3), NOW(3)),
    (UUID(), 'RH', 'Gestion administrative des employés, stagiaires et stages', true, NOW(3), NOW(3)),
    (UUID(), 'ENCADREUR', 'Consultation des données nécessaires au suivi des stages', true, NOW(3), NOW(3)),
    (UUID(), 'DIRECTION', 'Consultation globale, statistiques et audit', true, NOW(3), NOW(3)),
    (UUID(), 'UTILISATEUR', 'Consultation standard des données métier', true, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
    `description` = VALUES(`description`),
    `is_active` = true,
    `updated_at` = NOW(3);

-- Catalogue stable des permissions utilisées par les gardes NestJS.
INSERT INTO `permissions` (
    `id`, `code`, `name`, `description`, `category`,
    `is_active`, `created_at`, `updated_at`
)
VALUES
    (UUID(), 'dashboard.read', 'Consulter le tableau de bord', 'Affiche les statistiques et les activités récentes.', 'dashboard', true, NOW(3), NOW(3)),
    (UUID(), 'departments.read', 'Consulter les départements', 'Consulte la liste et le détail des départements.', 'departments', true, NOW(3), NOW(3)),
    (UUID(), 'departments.create', 'Créer les départements', 'Crée un département.', 'departments', true, NOW(3), NOW(3)),
    (UUID(), 'departments.update', 'Modifier les départements', 'Modifie un département.', 'departments', true, NOW(3), NOW(3)),
    (UUID(), 'departments.deactivate', 'Désactiver les départements', 'Désactive un département.', 'departments', true, NOW(3), NOW(3)),
    (UUID(), 'employees.read', 'Consulter les employés', 'Consulte la liste et le détail des employés.', 'employees', true, NOW(3), NOW(3)),
    (UUID(), 'employees.create', 'Créer les employés', 'Crée un employé.', 'employees', true, NOW(3), NOW(3)),
    (UUID(), 'employees.update', 'Modifier les employés', 'Modifie un employé.', 'employees', true, NOW(3), NOW(3)),
    (UUID(), 'employees.deactivate', 'Désactiver les employés', 'Désactive un employé.', 'employees', true, NOW(3), NOW(3)),
    (UUID(), 'users.read', 'Consulter les utilisateurs', 'Consulte les comptes applicatifs.', 'users', true, NOW(3), NOW(3)),
    (UUID(), 'users.create', 'Créer les utilisateurs', 'Crée un compte applicatif.', 'users', true, NOW(3), NOW(3)),
    (UUID(), 'users.update', 'Modifier les utilisateurs', 'Modifie le rôle ou l’état d’un compte.', 'users', true, NOW(3), NOW(3)),
    (UUID(), 'users.deactivate', 'Désactiver les utilisateurs', 'Désactive un compte applicatif.', 'users', true, NOW(3), NOW(3)),
    (UUID(), 'users.reset-password', 'Réinitialiser les mots de passe', 'Réinitialise le mot de passe d’un autre utilisateur.', 'users', true, NOW(3), NOW(3)),
    (UUID(), 'roles.read', 'Consulter les rôles', 'Consulte les rôles et leurs permissions.', 'roles', true, NOW(3), NOW(3)),
    (UUID(), 'roles.create', 'Créer les rôles', 'Crée un rôle applicatif.', 'roles', true, NOW(3), NOW(3)),
    (UUID(), 'roles.update', 'Modifier les rôles', 'Modifie un rôle applicatif.', 'roles', true, NOW(3), NOW(3)),
    (UUID(), 'roles.deactivate', 'Désactiver les rôles', 'Désactive un rôle inutilisé.', 'roles', true, NOW(3), NOW(3)),
    (UUID(), 'roles.permissions.manage', 'Attribuer les permissions', 'Remplace les permissions attribuées à un rôle.', 'roles', true, NOW(3), NOW(3)),
    (UUID(), 'permissions.read', 'Consulter les permissions', 'Consulte le catalogue des permissions disponibles.', 'permissions', true, NOW(3), NOW(3)),
    (UUID(), 'interns.read', 'Consulter les stagiaires', 'Consulte la liste et le détail des stagiaires.', 'interns', true, NOW(3), NOW(3)),
    (UUID(), 'interns.create', 'Créer les stagiaires', 'Crée un stagiaire.', 'interns', true, NOW(3), NOW(3)),
    (UUID(), 'interns.update', 'Modifier les stagiaires', 'Modifie un stagiaire.', 'interns', true, NOW(3), NOW(3)),
    (UUID(), 'interns.deactivate', 'Désactiver les stagiaires', 'Désactive un stagiaire.', 'interns', true, NOW(3), NOW(3)),
    (UUID(), 'supervisors.read', 'Consulter les encadreurs', 'Consulte la liste et le détail des encadreurs.', 'supervisors', true, NOW(3), NOW(3)),
    (UUID(), 'supervisors.create', 'Créer les encadreurs', 'Crée un profil encadreur.', 'supervisors', true, NOW(3), NOW(3)),
    (UUID(), 'supervisors.update', 'Modifier les encadreurs', 'Modifie un profil encadreur.', 'supervisors', true, NOW(3), NOW(3)),
    (UUID(), 'supervisors.deactivate', 'Désactiver les encadreurs', 'Désactive un profil encadreur.', 'supervisors', true, NOW(3), NOW(3)),
    (UUID(), 'authorities.read', 'Consulter les autorités', 'Consulte la liste et le détail des autorités signataires.', 'authorities', true, NOW(3), NOW(3)),
    (UUID(), 'authorities.create', 'Créer les autorités', 'Crée une autorité signataire.', 'authorities', true, NOW(3), NOW(3)),
    (UUID(), 'authorities.update', 'Modifier les autorités', 'Modifie une autorité signataire.', 'authorities', true, NOW(3), NOW(3)),
    (UUID(), 'authorities.deactivate', 'Désactiver les autorités', 'Désactive une autorité signataire.', 'authorities', true, NOW(3), NOW(3)),
    (UUID(), 'internships.read', 'Consulter les stages', 'Consulte la liste et le détail des stages.', 'internships', true, NOW(3), NOW(3)),
    (UUID(), 'internships.create', 'Créer les stages', 'Crée un stage.', 'internships', true, NOW(3), NOW(3)),
    (UUID(), 'internships.update', 'Modifier les stages', 'Modifie un stage, son statut ou sa note.', 'internships', true, NOW(3), NOW(3)),
    (UUID(), 'internships.deactivate', 'Désactiver les stages', 'Désactive un stage.', 'internships', true, NOW(3), NOW(3)),
    (UUID(), 'projects.read', 'Consulter les projets', 'Consulte la liste et le détail des projets.', 'projects', true, NOW(3), NOW(3)),
    (UUID(), 'projects.create', 'Créer les projets', 'Crée un projet.', 'projects', true, NOW(3), NOW(3)),
    (UUID(), 'projects.update', 'Modifier les projets', 'Modifie un projet.', 'projects', true, NOW(3), NOW(3)),
    (UUID(), 'projects.deactivate', 'Désactiver les projets', 'Désactive un projet.', 'projects', true, NOW(3), NOW(3)),
    (UUID(), 'project-assignments.read', 'Consulter les affectations', 'Consulte les affectations des stages aux projets.', 'project-assignments', true, NOW(3), NOW(3)),
    (UUID(), 'project-assignments.create', 'Créer les affectations', 'Affecte un stage à un projet.', 'project-assignments', true, NOW(3), NOW(3)),
    (UUID(), 'project-assignments.update', 'Modifier les affectations', 'Modifie une affectation de projet.', 'project-assignments', true, NOW(3), NOW(3)),
    (UUID(), 'project-assignments.deactivate', 'Retirer les affectations', 'Retire une affectation de projet.', 'project-assignments', true, NOW(3), NOW(3)),
    (UUID(), 'audit-logs.read', 'Consulter le journal d’audit', 'Consulte les événements du journal d’audit.', 'audit-logs', true, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `category` = VALUES(`category`),
    `is_active` = true,
    `updated_at` = NOW(3);

-- L’administrateur conserve toutes les permissions.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW(3)
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.`name` = 'ADMINISTRATEUR';

-- Droits de consultation communs.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW(3)
FROM `roles` r
JOIN `permissions` p ON p.`code` IN (
    'dashboard.read',
    'departments.read',
    'interns.read',
    'supervisors.read',
    'authorities.read',
    'internships.read',
    'projects.read',
    'project-assignments.read'
)
WHERE r.`name` IN ('RH', 'ENCADREUR', 'DIRECTION', 'UTILISATEUR');

-- Le rôle RH gère les ressources administratives liées aux stages.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW(3)
FROM `roles` r
JOIN `permissions` p ON p.`code` IN (
    'employees.read',
    'employees.create',
    'employees.update',
    'employees.deactivate',
    'interns.create',
    'interns.update',
    'interns.deactivate',
    'supervisors.create',
    'supervisors.update',
    'supervisors.deactivate',
    'authorities.create',
    'authorities.update',
    'authorities.deactivate',
    'internships.create',
    'internships.update',
    'internships.deactivate'
)
WHERE r.`name` = 'RH';

-- La direction consulte les employés et le journal d’audit.
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.`id`, p.`id`, NOW(3)
FROM `roles` r
JOIN `permissions` p ON p.`code` IN ('employees.read', 'audit-logs.read')
WHERE r.`name` = 'DIRECTION';
