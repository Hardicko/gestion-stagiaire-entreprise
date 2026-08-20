import 'reflect-metadata';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { InternshipStatus, InternshipType } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateInternshipDto } from './dto/create-internship.dto';
import { InternshipService } from './internship.service';

describe('InternshipService', () => {
  const internRepository = {
    findFirst: jest.fn(),
  };
  const departmentRepository = {
    findFirst: jest.fn(),
  };
  const supervisorRepository = {
    findFirst: jest.fn(),
  };
  const authorityRepository = {
    findFirst: jest.fn(),
  };
  const internshipRepository = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const prisma = {
    intern: internRepository,
    department: departmentRepository,
    supervisor: supervisorRepository,
    authority: authorityRepository,
    internship: internshipRepository,
  } as unknown as PrismaService;

  let service: InternshipService;

  const validDto: CreateInternshipDto = {
    referenceCode: ' stage-001 ',
    title: ' Développement web ',
    description: ' Mission de développement ',
    startDate: '2026-09-01',
    endDate: '2026-12-01',
    internshipType: InternshipType.ACADEMIC,
    monthlyAllowance: 75000,
    workLocation: ' Bamako ',
    internId: 'intern-id',
    departmentId: 'department-id',
    supervisorId: 'supervisor-id',
    authorityId: 'authority-id',
    grade: 20,
  };

  function mockActiveRelations(): void {
    internRepository.findFirst.mockResolvedValue({ id: 'intern-id' });
    departmentRepository.findFirst.mockResolvedValue({
      id: 'department-id',
    });
    supervisorRepository.findFirst.mockResolvedValue({
      id: 'supervisor-id',
    });
    authorityRepository.findFirst.mockResolvedValue({
      id: 'authority-id',
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InternshipService(prisma);
  });

  it('crée un stage avec les valeurs normalisées et les valeurs par défaut', async () => {
    mockActiveRelations();
    internshipRepository.findUnique.mockResolvedValue(null);
    internshipRepository.findFirst.mockResolvedValue(null);
    internshipRepository.create.mockResolvedValue({ id: 'internship-id' });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'internship-id',
    });

    expect(internshipRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceCode: 'STAGE-001',
          title: 'Développement web',
          description: 'Mission de développement',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          status: InternshipStatus.PLANNED,
          currency: 'XOF',
          workLocation: 'Bamako',
          grade: 20,
          isActive: true,
        }),
      }),
    );
  });

  it('refuse une date de fin antérieure à la date de début', async () => {
    await expect(
      service.create({
        ...validDto,
        startDate: '2026-12-01',
        endDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(internRepository.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un stagiaire introuvable ou inactif', async () => {
    internRepository.findFirst.mockResolvedValue(null);

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(internshipRepository.create).not.toHaveBeenCalled();
  });

  it('refuse une référence déjà utilisée', async () => {
    mockActiveRelations();
    internshipRepository.findUnique.mockResolvedValue({
      id: 'existing-internship',
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internshipRepository.create).not.toHaveBeenCalled();
  });

  it('refuse le chevauchement de deux stages du même stagiaire', async () => {
    mockActiveRelations();
    internshipRepository.findUnique.mockResolvedValue(null);
    internshipRepository.findFirst.mockResolvedValue({
      id: 'overlapping-internship',
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internshipRepository.create).not.toHaveBeenCalled();
  });

  it('permet l’enregistrement d’un stage déjà annulé sans vérifier le chevauchement', async () => {
    mockActiveRelations();
    internshipRepository.findUnique.mockResolvedValue(null);
    internshipRepository.create.mockResolvedValue({ id: 'internship-id' });

    await service.create({
      ...validDto,
      status: InternshipStatus.CANCELLED,
    });

    expect(internshipRepository.findFirst).not.toHaveBeenCalled();
    expect(internshipRepository.create).toHaveBeenCalled();
  });

  it('retourne les stages actifs du plus récent au plus ancien', async () => {
    internshipRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(internshipRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
        },
        orderBy: {
          startDate: 'desc',
        },
      }),
    );
  });

  it('permet de vider les champs facultatifs lors d’une modification', async () => {
    internshipRepository.findUnique.mockResolvedValue({
      id: 'internship-id',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-01'),
      status: InternshipStatus.PLANNED,
      internId: 'intern-id',
      departmentId: 'department-id',
      supervisorId: 'supervisor-id',
      authorityId: 'authority-id',
      isActive: true,
    });
    mockActiveRelations();
    internshipRepository.findFirst.mockResolvedValue(null);
    internshipRepository.update.mockResolvedValue({ id: 'internship-id' });

    await service.update('internship-id', {
      description: null,
      monthlyAllowance: null,
      authorityId: null,
      grade: null,
    });

    expect(authorityRepository.findFirst).not.toHaveBeenCalled();
    expect(internshipRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          description: null,
          monthlyAllowance: null,
          authorityId: null,
          grade: null,
        },
      }),
    );
  });

  it('refuse la désactivation d’un stage en cours', async () => {
    internshipRepository.findUnique.mockResolvedValue({
      id: 'internship-id',
      status: InternshipStatus.ONGOING,
      isActive: true,
    });

    await expect(service.remove('internship-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(internshipRepository.update).not.toHaveBeenCalled();
  });

  it('désactive un stage qui n’est pas en cours', async () => {
    internshipRepository.findUnique.mockResolvedValue({
      id: 'internship-id',
      status: InternshipStatus.COMPLETED,
      isActive: true,
    });
    internshipRepository.update.mockResolvedValue({
      id: 'internship-id',
      isActive: false,
    });

    await expect(service.remove('internship-id')).resolves.toEqual({
      id: 'internship-id',
      isActive: false,
    });
    expect(internshipRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'internship-id',
      },
      data: {
        isActive: false,
      },
    });
  });
});
