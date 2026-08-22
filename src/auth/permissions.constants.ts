export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',

  DEPARTMENTS_READ: 'departments.read',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_UPDATE: 'departments.update',
  DEPARTMENTS_DEACTIVATE: 'departments.deactivate',

  EMPLOYEES_READ: 'employees.read',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DEACTIVATE: 'employees.deactivate',

  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DEACTIVATE: 'users.deactivate',
  USERS_RESET_PASSWORD: 'users.reset-password',

  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DEACTIVATE: 'roles.deactivate',
  ROLES_MANAGE_PERMISSIONS: 'roles.permissions.manage',
  PERMISSIONS_READ: 'permissions.read',

  INTERNS_READ: 'interns.read',
  INTERNS_CREATE: 'interns.create',
  INTERNS_UPDATE: 'interns.update',
  INTERNS_DEACTIVATE: 'interns.deactivate',

  SUPERVISORS_READ: 'supervisors.read',
  SUPERVISORS_CREATE: 'supervisors.create',
  SUPERVISORS_UPDATE: 'supervisors.update',
  SUPERVISORS_DEACTIVATE: 'supervisors.deactivate',

  AUTHORITIES_READ: 'authorities.read',
  AUTHORITIES_CREATE: 'authorities.create',
  AUTHORITIES_UPDATE: 'authorities.update',
  AUTHORITIES_DEACTIVATE: 'authorities.deactivate',

  INTERNSHIPS_READ: 'internships.read',
  INTERNSHIPS_CREATE: 'internships.create',
  INTERNSHIPS_UPDATE: 'internships.update',
  INTERNSHIPS_DEACTIVATE: 'internships.deactivate',

  PROJECTS_READ: 'projects.read',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DEACTIVATE: 'projects.deactivate',

  PROJECT_ASSIGNMENTS_READ: 'project-assignments.read',
  PROJECT_ASSIGNMENTS_CREATE: 'project-assignments.create',
  PROJECT_ASSIGNMENTS_UPDATE: 'project-assignments.update',
  PROJECT_ASSIGNMENTS_DEACTIVATE: 'project-assignments.deactivate',

  AUDIT_LOGS_READ: 'audit-logs.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  description: string;
  category: string;
}

interface CrudPermissionCodes {
  read: PermissionCode;
  create: PermissionCode;
  update: PermissionCode;
  deactivate: PermissionCode;
}

function permission(
  code: PermissionCode,
  name: string,
  description: string,
  category: string,
): PermissionDefinition {
  return { code, name, description, category };
}

function crudPermissions(
  category: string,
  label: string,
  codes: CrudPermissionCodes,
): PermissionDefinition[] {
  return [
    permission(
      codes.read,
      `Consulter ${label}`,
      `Consulte la liste et le détail de ${label}.`,
      category,
    ),
    permission(
      codes.create,
      `Créer ${label}`,
      `Crée une ressource dans ${label}.`,
      category,
    ),
    permission(
      codes.update,
      `Modifier ${label}`,
      `Modifie une ressource dans ${label}.`,
      category,
    ),
    permission(
      codes.deactivate,
      `Désactiver ${label}`,
      `Désactive ou retire une ressource dans ${label}.`,
      category,
    ),
  ];
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  permission(
    PERMISSIONS.DASHBOARD_READ,
    'Consulter le tableau de bord',
    'Affiche les statistiques et les activités récentes.',
    'dashboard',
  ),
  ...crudPermissions('departments', 'les départements', {
    read: PERMISSIONS.DEPARTMENTS_READ,
    create: PERMISSIONS.DEPARTMENTS_CREATE,
    update: PERMISSIONS.DEPARTMENTS_UPDATE,
    deactivate: PERMISSIONS.DEPARTMENTS_DEACTIVATE,
  }),
  ...crudPermissions('employees', 'les employés', {
    read: PERMISSIONS.EMPLOYEES_READ,
    create: PERMISSIONS.EMPLOYEES_CREATE,
    update: PERMISSIONS.EMPLOYEES_UPDATE,
    deactivate: PERMISSIONS.EMPLOYEES_DEACTIVATE,
  }),
  ...crudPermissions('users', 'les utilisateurs', {
    read: PERMISSIONS.USERS_READ,
    create: PERMISSIONS.USERS_CREATE,
    update: PERMISSIONS.USERS_UPDATE,
    deactivate: PERMISSIONS.USERS_DEACTIVATE,
  }),
  permission(
    PERMISSIONS.USERS_RESET_PASSWORD,
    'Réinitialiser les mots de passe',
    'Réinitialise le mot de passe d’un autre utilisateur.',
    'users',
  ),
  ...crudPermissions('roles', 'les rôles', {
    read: PERMISSIONS.ROLES_READ,
    create: PERMISSIONS.ROLES_CREATE,
    update: PERMISSIONS.ROLES_UPDATE,
    deactivate: PERMISSIONS.ROLES_DEACTIVATE,
  }),
  permission(
    PERMISSIONS.ROLES_MANAGE_PERMISSIONS,
    'Attribuer les permissions',
    'Remplace les permissions attribuées à un rôle.',
    'roles',
  ),
  permission(
    PERMISSIONS.PERMISSIONS_READ,
    'Consulter les permissions',
    'Consulte le catalogue des permissions disponibles.',
    'permissions',
  ),
  ...crudPermissions('interns', 'les stagiaires', {
    read: PERMISSIONS.INTERNS_READ,
    create: PERMISSIONS.INTERNS_CREATE,
    update: PERMISSIONS.INTERNS_UPDATE,
    deactivate: PERMISSIONS.INTERNS_DEACTIVATE,
  }),
  ...crudPermissions('supervisors', 'les encadreurs', {
    read: PERMISSIONS.SUPERVISORS_READ,
    create: PERMISSIONS.SUPERVISORS_CREATE,
    update: PERMISSIONS.SUPERVISORS_UPDATE,
    deactivate: PERMISSIONS.SUPERVISORS_DEACTIVATE,
  }),
  ...crudPermissions('authorities', 'les autorités', {
    read: PERMISSIONS.AUTHORITIES_READ,
    create: PERMISSIONS.AUTHORITIES_CREATE,
    update: PERMISSIONS.AUTHORITIES_UPDATE,
    deactivate: PERMISSIONS.AUTHORITIES_DEACTIVATE,
  }),
  ...crudPermissions('internships', 'les stages', {
    read: PERMISSIONS.INTERNSHIPS_READ,
    create: PERMISSIONS.INTERNSHIPS_CREATE,
    update: PERMISSIONS.INTERNSHIPS_UPDATE,
    deactivate: PERMISSIONS.INTERNSHIPS_DEACTIVATE,
  }),
  ...crudPermissions('projects', 'les projets', {
    read: PERMISSIONS.PROJECTS_READ,
    create: PERMISSIONS.PROJECTS_CREATE,
    update: PERMISSIONS.PROJECTS_UPDATE,
    deactivate: PERMISSIONS.PROJECTS_DEACTIVATE,
  }),
  ...crudPermissions('project-assignments', 'les affectations de projets', {
    read: PERMISSIONS.PROJECT_ASSIGNMENTS_READ,
    create: PERMISSIONS.PROJECT_ASSIGNMENTS_CREATE,
    update: PERMISSIONS.PROJECT_ASSIGNMENTS_UPDATE,
    deactivate: PERMISSIONS.PROJECT_ASSIGNMENTS_DEACTIVATE,
  }),
  permission(
    PERMISSIONS.AUDIT_LOGS_READ,
    'Consulter le journal d’audit',
    'Consulte les événements du journal d’audit.',
    'audit-logs',
  ),
];

const STANDARD_READ_PERMISSIONS: readonly PermissionCode[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.DEPARTMENTS_READ,
  PERMISSIONS.INTERNS_READ,
  PERMISSIONS.SUPERVISORS_READ,
  PERMISSIONS.AUTHORITIES_READ,
  PERMISSIONS.INTERNSHIPS_READ,
  PERMISSIONS.PROJECTS_READ,
  PERMISSIONS.PROJECT_ASSIGNMENTS_READ,
];

export const DEFAULT_ROLE_PERMISSIONS: Readonly<
  Record<string, readonly PermissionCode[]>
> = {
  ADMINISTRATEUR: PERMISSION_CATALOG.map(({ code }) => code),
  RH: [
    ...STANDARD_READ_PERMISSIONS,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.EMPLOYEES_DEACTIVATE,
    PERMISSIONS.INTERNS_CREATE,
    PERMISSIONS.INTERNS_UPDATE,
    PERMISSIONS.INTERNS_DEACTIVATE,
    PERMISSIONS.SUPERVISORS_CREATE,
    PERMISSIONS.SUPERVISORS_UPDATE,
    PERMISSIONS.SUPERVISORS_DEACTIVATE,
    PERMISSIONS.AUTHORITIES_CREATE,
    PERMISSIONS.AUTHORITIES_UPDATE,
    PERMISSIONS.AUTHORITIES_DEACTIVATE,
    PERMISSIONS.INTERNSHIPS_CREATE,
    PERMISSIONS.INTERNSHIPS_UPDATE,
    PERMISSIONS.INTERNSHIPS_DEACTIVATE,
  ],
  ENCADREUR: STANDARD_READ_PERMISSIONS,
  DIRECTION: [
    ...STANDARD_READ_PERMISSIONS,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.AUDIT_LOGS_READ,
  ],
  UTILISATEUR: STANDARD_READ_PERMISSIONS,
};
