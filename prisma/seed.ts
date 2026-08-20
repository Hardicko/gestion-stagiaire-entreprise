import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

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
  const adminEmail = getRequiredEnvironmentVariable(
    'SEED_ADMIN_EMAIL',
  ).toLowerCase();

  const standardUserEmail = getRequiredEnvironmentVariable(
    'SEED_USER_EMAIL',
  ).toLowerCase();

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

  const adminEmployee = await prisma.employee.upsert({
    where: {
      employeeNumber: 'EMP-ADMIN-001',
    },
    update: {
      email: adminEmail,
      departmentId: department.id,
      isActive: true,
    },
    create: {
      employeeNumber: 'EMP-ADMIN-001',
      firstName: 'Administrateur',
      lastName: 'Système',
      email: adminEmail,
      jobTitle: 'Administrateur',
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
      isActive: true,
    },
    create: {
      employeeNumber: 'EMP-USER-001',
      firstName: 'Utilisateur',
      lastName: 'Standard',
      email: standardUserEmail,
      jobTitle: 'Utilisateur',
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

  console.log('Les comptes ADMINISTRATEUR et UTILISATEUR sont prêts.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });