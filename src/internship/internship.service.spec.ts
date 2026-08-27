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
    findMany: jest.fn(),
  };
  const supervisorRepository = {
    findFirst: jest.fn(),
  };
  const authorityRepository = {
    findFirst: jest.fn(),
  };
  const projectAssignmentRepository = {
    count: jest.fn(),
  };
  const internshipRepository = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const projectRepository = {
    count: jest.fn(),
  };
  const internshipReferenceCodeSequenceRepository = {
    upsert: jest.fn(),
  };
  const transaction = {
    internship: internshipRepository,
    internshipReferenceCodeSequence: internshipReferenceCodeSequenceRepository,
  };
  const prismaClient = {
    intern: internRepository,
    department: departmentRepository,
    supervisor: supervisorRepository,
    authority: authorityRepository,
    projectAssignment: projectAssignmentRepository,
    internship: internshipRepository,
    project: projectRepository,
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };

  const prisma = prismaClient as unknown as PrismaService;

  let service: InternshipService;

  const validDto: CreateInternshipDto = {
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
    service = new InternshipService(prisma);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crée un stage avec les valeurs normalisées et les valeurs par défaut', async () => {
    mockActiveRelations();
    internshipRepository.findFirst.mockResolvedValue(null);
    internshipRepository.findUnique.mockResolvedValue(null);
    internshipReferenceCodeSequenceRepository.upsert.mockResolvedValue({
      year: 2026,
      lastValue: 1,
    });
    internshipRepository.create.mockResolvedValue({
      id: 'internship-id',
      referenceCode: 'STAGE-2026-0001',
    });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'internship-id',
      referenceCode: 'STAGE-2026-0001',
    });

    expect(internshipRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceCode: 'STAGE-2026-0001',
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

  it('saute une référence existante et utilise la suivante', async () => {
    mockActiveRelations();
    internshipRepository.findFirst.mockResolvedValue(null);
    internshipReferenceCodeSequenceRepository.upsert
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 2,
      });
    internshipRepository.findUnique
      .mockResolvedValueOnce({ id: 'existing-internship' })
      .mockResolvedValueOnce(null);
    internshipRepository.create.mockResolvedValue({ id: 'internship-id' });

    await service.create(validDto);

    expect(internshipRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceCode: 'STAGE-2026-0002',
        }),
      }),
    );
  });

  it('réessaie après une collision simultanée de référence', async () => {
    mockActiveRelations();
    internshipRepository.findFirst.mockResolvedValue(null);
    internshipReferenceCodeSequenceRepository.upsert
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 1,
      })
      .mockResolvedValueOnce({
        year: 2026,
        lastValue: 2,
      });
    internshipRepository.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'concurrent-internship' })
      .mockResolvedValueOnce(null);
    internshipRepository.create
      .mockRejectedValueOnce(
        Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        }),
      )
      .mockResolvedValueOnce({
        id: 'internship-id',
        referenceCode: 'STAGE-2026-0002',
      });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'internship-id',
      referenceCode: 'STAGE-2026-0002',
    });
    expect(prismaClient.$transaction).toHaveBeenCalledTimes(2);
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

  it('retourne le suivi paginé avec ses indicateurs et ses filtres', async () => {
    internshipRepository.findMany.mockResolvedValue([{ id: 'stage-1' }]);
    internshipRepository.count
      .mockResolvedValueOnce(21)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    projectRepository.count.mockResolvedValue(2);
    departmentRepository.findMany.mockResolvedValue([
      { id: 'department-id', code: 'DSI', name: 'Informatique' },
    ]);

    await expect(
      service.getTracking({
        q: 'Moussa',
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        summary: {
          ongoingInternships: 4,
          plannedInternships: 3,
          activeProjects: 2,
        },
        items: [{ id: 'stage-1' }],
        pagination: {
          page: 2,
          limit: 10,
          total: 21,
          totalPages: 3,
        },
      }),
    );

    expect(internshipRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({ isActive: true }),
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

  it('refuse de désactiver un stage avec une affectation active', async () => {
    internshipRepository.findUnique.mockResolvedValue({
      id: 'internship-id',
      status: InternshipStatus.COMPLETED,
      isActive: true,
    });
    projectAssignmentRepository.count.mockResolvedValue(1);

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
    projectAssignmentRepository.count.mockResolvedValue(0);
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
