import 'reflect-metadata';

import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { AuthorityService } from './authority.service';

describe('AuthorityService', () => {
  const employeeRepository = {
    findFirst: jest.fn(),
  };

  const departmentRepository = {
    findFirst: jest.fn(),
  };

  const authorityRepository = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const internshipRepository = {
    count: jest.fn(),
  };

  const prisma = {
    employee: employeeRepository,
    department: departmentRepository,
    authority: authorityRepository,
    internship: internshipRepository,
  } as unknown as PrismaService;

  let service: AuthorityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthorityService(prisma);
  });

  it('crée et normalise une autorité signataire', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: 'employee-id' });
    departmentRepository.findFirst.mockResolvedValue({
      id: 'department-id',
    });
    authorityRepository.findFirst.mockResolvedValue(null);
    authorityRepository.create.mockResolvedValue({ id: 'authority-id' });

    await expect(
      service.create({
        employeeId: 'employee-id',
        departmentId: 'department-id',
        name: ' Direction générale ',
        email: ' DIRECTION@EXAMPLE.COM ',
        signingTitle: ' Directeur général ',
      }),
    ).resolves.toEqual({ id: 'authority-id' });

    expect(authorityRepository.create).toHaveBeenCalledWith({
      data: {
        employeeId: 'employee-id',
        departmentId: 'department-id',
        name: 'Direction générale',
        email: 'direction@example.com',
        signingTitle: 'Directeur général',
        isActive: true,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  });

  it('refuse un employé introuvable ou inactif', async () => {
    employeeRepository.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        employeeId: 'missing-employee',
        name: 'Direction',
        email: 'direction@example.com',
        signingTitle: 'Directeur',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(authorityRepository.create).not.toHaveBeenCalled();
  });

  it('refuse un département introuvable ou inactif', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: 'employee-id' });
    departmentRepository.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        employeeId: 'employee-id',
        departmentId: 'missing-department',
        name: 'Direction',
        email: 'direction@example.com',
        signingTitle: 'Directeur',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(authorityRepository.create).not.toHaveBeenCalled();
  });

  it('refuse un employé ou un email déjà utilisé', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: 'employee-id' });
    authorityRepository.findFirst.mockResolvedValue({
      id: 'existing-authority',
    });

    await expect(
      service.create({
        employeeId: 'employee-id',
        name: 'Direction',
        email: 'direction@example.com',
        signingTitle: 'Directeur',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(authorityRepository.create).not.toHaveBeenCalled();
  });

  it('retourne les autorités actives par ordre alphabétique', async () => {
    authorityRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(authorityRepository.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('permet de retirer le département lors d’une modification', async () => {
    authorityRepository.findUnique.mockResolvedValue({
      id: 'authority-id',
      isActive: true,
    });
    authorityRepository.update.mockResolvedValue({ id: 'authority-id' });

    await service.update('authority-id', {
      departmentId: null,
    });

    expect(departmentRepository.findFirst).not.toHaveBeenCalled();
    expect(authorityRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'authority-id',
      },
      data: {
        departmentId: null,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  });

  it('refuse la désactivation avec un stage actif', async () => {
    authorityRepository.findUnique.mockResolvedValue({
      id: 'authority-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(1);

    await expect(service.remove('authority-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(authorityRepository.update).not.toHaveBeenCalled();
  });

  it('désactive une autorité sans stage actif', async () => {
    authorityRepository.findUnique.mockResolvedValue({
      id: 'authority-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(0);
    authorityRepository.update.mockResolvedValue({
      id: 'authority-id',
      isActive: false,
    });

    await expect(service.remove('authority-id')).resolves.toEqual({
      id: 'authority-id',
      isActive: false,
    });
    expect(authorityRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'authority-id',
      },
      data: {
        isActive: false,
      },
      include: {
        employee: {
          include: {
            position: true,
          },
        },
        department: true,
      },
    });
  });
});
