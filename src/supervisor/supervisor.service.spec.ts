import 'reflect-metadata';

import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { SupervisorService } from './supervisor.service';

describe('SupervisorService', () => {
  const employeeRepository = {
    findFirst: jest.fn(),
  };

  const supervisorRepository = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const internshipRepository = {
    count: jest.fn(),
  };

  const prisma = {
    employee: employeeRepository,
    supervisor: supervisorRepository,
    internship: internshipRepository,
  } as unknown as PrismaService;

  let service: SupervisorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SupervisorService(prisma);
  });

  it('crée un maître de stage à partir d’un employé actif', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: 'employee-id' });
    supervisorRepository.findUnique.mockResolvedValue(null);
    supervisorRepository.create.mockResolvedValue({ id: 'supervisor-id' });

    await expect(
      service.create({
        employeeId: 'employee-id',
      }),
    ).resolves.toEqual({ id: 'supervisor-id' });

    expect(supervisorRepository.create).toHaveBeenCalledWith({
      data: {
        employeeId: 'employee-id',
        isActive: true,
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });
  });

  it('refuse un employé introuvable ou inactif', async () => {
    employeeRepository.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ employeeId: 'missing-employee' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(supervisorRepository.create).not.toHaveBeenCalled();
  });

  it('refuse un second profil pour le même employé', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: 'employee-id' });
    supervisorRepository.findUnique.mockResolvedValue({
      id: 'existing-supervisor',
    });

    await expect(
      service.create({ employeeId: 'employee-id' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(supervisorRepository.create).not.toHaveBeenCalled();
  });

  it('retourne les maîtres de stage actifs', async () => {
    supervisorRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(supervisorRepository.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: {
        employee: {
          lastName: 'asc',
        },
      },
    });
  });

  it('signale un maître de stage introuvable', async () => {
    supervisorRepository.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuse la désactivation avec un stage planifié ou en cours', async () => {
    supervisorRepository.findUnique.mockResolvedValue({
      id: 'supervisor-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(1);

    await expect(service.remove('supervisor-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(supervisorRepository.update).not.toHaveBeenCalled();
  });

  it('désactive un maître de stage qui n’a pas de stage actif', async () => {
    supervisorRepository.findUnique.mockResolvedValue({
      id: 'supervisor-id',
      isActive: true,
    });
    internshipRepository.count.mockResolvedValue(0);
    supervisorRepository.update.mockResolvedValue({
      id: 'supervisor-id',
      isActive: false,
    });

    await expect(service.remove('supervisor-id')).resolves.toEqual({
      id: 'supervisor-id',
      isActive: false,
    });
    expect(supervisorRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'supervisor-id',
      },
      data: {
        isActive: false,
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });
  });
});
