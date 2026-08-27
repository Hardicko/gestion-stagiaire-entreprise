import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from '../src/auth/permissions.constants';

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`La variable ${name} est obligatoire.`);
  }

  return value;
}

const adapter = new PrismaMariaDb({
  host: getRequiredEnvironmentVariable('DATABASE_HOST'),
  port: Number(getRequiredEnvironmentVariable('DATABASE_PORT')),
  user: getRequiredEnvironmentVariable('DATABASE_USER'),
  password: getRequiredEnvironmentVariable('DATABASE_PASSWORD'),
  database: getRequiredEnvironmentVariable('DATABASE_NAME'),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {
        name: permission.name,
        description: permission.description,
        category: permission.category,
        isActive: true,
      },
      create: {
        ...permission,
        isActive: true,
      },
    });
  }

  const adminEmail =
    getRequiredEnvironmentVariable('SEED_ADMIN_EMAIL').toLowerCase();

  const standardUserEmail =
    getRequiredEnvironmentVariable('SEED_USER_EMAIL').toLowerCase();

  const adminPasswordHash = await argon2.hash(
    getRequiredEnvironmentVariable('SEED_ADMIN_PASSWORD'),
    {
      type: argon2.argon2id,
    },
  );

  const standardUserPasswordHash = await argon2.hash(
    getRequiredEnvironmentVariable('SEED_USER_PASSWORD'),
    {
      type: argon2.argon2id,
    },
  );

  const department = await prisma.department.upsert({
    where: {
      code: 'ADMIN',
    },
    update: {
      name: 'Administration',
      isActive: true,
    },
    create: {
      name: 'Administration',
      code: 'ADMIN',
      description: 'Administration générale',
      isActive: true,
    },
  });

  const defaultPositionDefinitions = [
    {
      code: 'DEV_BACKEND',
      name: 'Développeur backend',
      description: 'Développement des services backend et des API.',
    },
    {
      code: 'DEV_FRONTEND',
      name: 'Développeur frontend',
      description: 'Développement des interfaces utilisateur.',
    },
    {
      code: 'ADMIN_SYSTEME',
      name: 'Administrateur système',
      description: 'Administration des systèmes et des plateformes.',
    },
    {
      code: 'RESPONSABLE_RH',
      name: 'Responsable RH',
      description: 'Gestion des ressources humaines.',
    },
    {
      code: 'CHEF_PROJET',
      name: 'Chef de projet',
      description: 'Pilotage et coordination des projets.',
    },
    {
      code: 'RESPONSABLE_RESEAU',
      name: 'Responsable réseau',
      description: 'Administration et supervision du réseau.',
    },
    {
      code: 'ASSISTANT_ADMINISTRATIF',
      name: 'Assistant administratif',
      description: 'Assistance aux activités administratives.',
    },
  ] as const;

  const defaultPositions: Record<string, { id: string }> = {};

  for (const positionDefinition of defaultPositionDefinitions) {
    defaultPositions[positionDefinition.code] = await prisma.position.upsert({
      where: {
        code: positionDefinition.code,
      },
      update: {
        name: positionDefinition.name,
        description: positionDefinition.description,
        isActive: true,
      },
      create: {
        ...positionDefinition,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  }

  const administratorPosition = defaultPositions.ADMIN_SYSTEME;
  const standardUserPosition = defaultPositions.ASSISTANT_ADMINISTRATIF;

  const administratorRole = await prisma.role.upsert({
    where: {
      name: 'ADMINISTRATEUR',
    },
    update: {
      isActive: true,
    },
    create: {
      name: 'ADMINISTRATEUR',
      description: 'Accès complet à l’application',
      isActive: true,
    },
  });

  const standardRole = await prisma.role.upsert({
    where: {
      name: 'UTILISATEUR',
    },
    update: {
      isActive: true,
    },
    create: {
      name: 'UTILISATEUR',
      description: 'Accès standard à l’application',
      isActive: true,
    },
  });

  const additionalRoleDefinitions = [
    {
      name: 'RH',
      description: 'Gestion administrative des employés, stagiaires et stages',
    },
    {
      name: 'ENCADREUR',
      description: 'Consultation des données nécessaires au suivi des stages',
    },
    {
      name: 'DIRECTION',
      description: 'Consultation globale, statistiques et audit',
    },
  ] as const;

  const defaultRoles: Record<string, { id: string }> = {
    ADMINISTRATEUR: administratorRole,
    UTILISATEUR: standardRole,
  };

  for (const roleDefinition of additionalRoleDefinitions) {
    defaultRoles[roleDefinition.name] = await prisma.role.upsert({
      where: {
        name: roleDefinition.name,
      },
      update: {
        description: roleDefinition.description,
        isActive: true,
      },
      create: {
        ...roleDefinition,
        isActive: true,
      },
    });
  }

  for (const [roleName, permissionCodes] of Object.entries(
    DEFAULT_ROLE_PERMISSIONS,
  )) {
    const role = defaultRoles[roleName];

    if (!role) {
      continue;
    }

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: [...permissionCodes],
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map(({ id: permissionId }) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  const adminEmployee = await prisma.employee.upsert({
    where: {
      employeeNumber: 'EMP-ADMIN-001',
    },
    update: {
      email: adminEmail,
      departmentId: department.id,
      positionId: administratorPosition.id,
      isActive: true,
    },
    create: {
      employeeNumber: 'EMP-ADMIN-001',
      firstName: 'Administrateur',
      lastName: 'Système',
      email: adminEmail,
      positionId: administratorPosition.id,
      departmentId: department.id,
      isActive: true,
    },
  });

  const standardEmployee = await prisma.employee.upsert({
    where: {
      employeeNumber: 'EMP-USER-001',
    },
    update: {
      email: standardUserEmail,
      departmentId: department.id,
      positionId: standardUserPosition.id,
      isActive: true,
    },
    create: {
      employeeNumber: 'EMP-USER-001',
      firstName: 'Utilisateur',
      lastName: 'Standard',
      email: standardUserEmail,
      positionId: standardUserPosition.id,
      departmentId: department.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      employeeId: adminEmployee.id,
    },
    update: {
      roleId: administratorRole.id,
      isActive: true,
    },
    create: {
      employeeId: adminEmployee.id,
      roleId: administratorRole.id,
      passwordHash: adminPasswordHash,
      mustChangePassword: true,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      employeeId: standardEmployee.id,
    },
    update: {
      roleId: standardRole.id,
      isActive: true,
    },
    create: {
      employeeId: standardEmployee.id,
      roleId: standardRole.id,
      passwordHash: standardUserPasswordHash,
      mustChangePassword: true,
      isActive: true,
    },
  });

  console.log('Les rôles, permissions et comptes initiaux sont prêts.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
