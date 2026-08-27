import 'reflect-metadata';

import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { PositionService } from './position.service';

describe('PositionService', () => {
  const positionRepository = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const employeeRepository = {
    count: jest.fn(),
  };
  const prisma = {
    position: positionRepository,
    employee: employeeRepository,
  } as unknown as PrismaService;

  let service: PositionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PositionService(prisma);
  });

  it('crée et normalise un poste', async () => {
    positionRepository.findFirst.mockResolvedValue(null);
    positionRepository.create.mockResolvedValue({ id: 'position-id' });

    await expect(
      service.create({
        code: ' dev_backend ',
        name: ' Développeur backend ',
        description: ' API et services ',
      }),
    ).resolves.toEqual({ id: 'position-id' });

    expect(positionRepository.create).toHaveBeenCalledWith({
      data: {
        code: 'DEV_BACKEND',
        name: 'Développeur backend',
        description: 'API et services',
        isActive: true,
      },
      include: {
        _count: {
          select: {
            employees: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });
  });

  it('refuse un nom ou un code déjà utilisé', async () => {
    positionRepository.findFirst.mockResolvedValue({
      id: 'existing-position',
    });

    await expect(
      service.create({
        code: 'DEV_BACKEND',
        name: 'Développeur backend',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(positionRepository.create).not.toHaveBeenCalled();
  });

  it('retourne uniquement les postes actifs', async () => {
    positionRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(positionRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    );
  });

  it('signale un poste introuvable', async () => {
    positionRepository.findUnique.mockResolvedValue(null);

    await expect(service.findOne('position-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuse la désactivation d’un poste encore utilisé', async () => {
    positionRepository.findUnique.mockResolvedValue({
      id: 'position-id',
      isActive: true,
    });
    employeeRepository.count.mockResolvedValue(1);

    await expect(service.remove('position-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(positionRepository.update).not.toHaveBeenCalled();
  });

  it('désactive un poste qui n’est utilisé par aucun employé actif', async () => {
    positionRepository.findUnique.mockResolvedValue({
      id: 'position-id',
      isActive: true,
    });
    employeeRepository.count.mockResolvedValue(0);
    positionRepository.update.mockResolvedValue({
      id: 'position-id',
      isActive: false,
    });

    await expect(service.remove('position-id')).resolves.toEqual({
      id: 'position-id',
      isActive: false,
    });
    expect(positionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'position-id' },
        data: { isActive: false },
      }),
    );
  });
});
