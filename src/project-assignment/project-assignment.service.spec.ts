import 'reflect-metadata';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AssignmentStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { ProjectAssignmentService } from './project-assignment.service';

describe('ProjectAssignmentService', () => {
  const internshipRepository = {
    findFirst: jest.fn(),
  };
  const projectRepository = {
    findFirst: jest.fn(),
  };
  const assignmentRepository = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const prisma = {
    internship: internshipRepository,
    project: projectRepository,
    projectAssignment: assignmentRepository,
  } as unknown as PrismaService;

  let service: ProjectAssignmentService;

  const validDto: CreateProjectAssignmentDto = {
    internshipId: 'internship-id',
    projectId: 'project-id',
    role: ' Développeur backend ',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    notes: ' Première affectation ',
  };

  function mockCompatiblePeriods(): void {
    internshipRepository.findFirst.mockResolvedValue({
      id: 'internship-id',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-31'),
    });
    projectRepository.findFirst.mockResolvedValue({
      id: 'project-id',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-01-31'),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectAssignmentService(prisma);
  });

  it('crée et normalise une affectation valide', async () => {
    mockCompatiblePeriods();
    assignmentRepository.findUnique.mockResolvedValue(null);
    assignmentRepository.create.mockResolvedValue({ id: 'assignment-id' });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'assignment-id',
    });
    expect(assignmentRepository.create).toHaveBeenCalledWith({
      data: {
        internshipId: 'internship-id',
        projectId: 'project-id',
        role: 'Développeur backend',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: AssignmentStatus.ASSIGNED,
        notes: 'Première affectation',
      },
      include: {
        internship: {
          include: {
            intern: true,
          },
        },
        project: true,
      },
    });
  });

  it('refuse un stage inactif, terminé ou introuvable', async () => {
    internshipRepository.findFirst.mockResolvedValue(null);

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(projectRepository.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un projet inactif, terminé ou introuvable', async () => {
    internshipRepository.findFirst.mockResolvedValue({
      id: 'internship-id',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-31'),
    });
    projectRepository.findFirst.mockResolvedValue(null);

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(assignmentRepository.create).not.toHaveBeenCalled();
  });

  it('refuse une période située hors du stage', async () => {
    internshipRepository.findFirst.mockResolvedValue({
      id: 'internship-id',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-12-31'),
    });
    projectRepository.findFirst.mockResolvedValue({
      id: 'project-id',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-31'),
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse une période située hors du projet', async () => {
    internshipRepository.findFirst.mockResolvedValue({
      id: 'internship-id',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-31'),
    });
    projectRepository.findFirst.mockResolvedValue({
      id: 'project-id',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-12-31'),
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse une seconde affectation du même stage au même projet', async () => {
    mockCompatiblePeriods();
    assignmentRepository.findUnique.mockResolvedValue({
      id: 'existing-assignment',
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(assignmentRepository.create).not.toHaveBeenCalled();
  });

  it('retourne les affectations qui ne sont pas retirées', async () => {
    assignmentRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(assignmentRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            not: AssignmentStatus.REMOVED,
          },
        },
        orderBy: {
          assignedAt: 'desc',
        },
      }),
    );
  });

  it('permet de vider les notes lors d’une modification', async () => {
    assignmentRepository.findUnique.mockResolvedValue({
      id: 'assignment-id',
      internshipId: 'internship-id',
      projectId: 'project-id',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-11-30'),
      status: AssignmentStatus.ASSIGNED,
    });
    mockCompatiblePeriods();
    assignmentRepository.update.mockResolvedValue({ id: 'assignment-id' });

    await service.update('assignment-id', {
      notes: null,
    });

    expect(assignmentRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          notes: null,
        },
      }),
    );
  });

  it('refuse de retirer deux fois la même affectation', async () => {
    assignmentRepository.findUnique.mockResolvedValue({
      id: 'assignment-id',
      status: AssignmentStatus.REMOVED,
    });

    await expect(service.remove('assignment-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(assignmentRepository.update).not.toHaveBeenCalled();
  });

  it('retire une affectation sans supprimer sa ligne', async () => {
    assignmentRepository.findUnique.mockResolvedValue({
      id: 'assignment-id',
      status: AssignmentStatus.IN_PROGRESS,
    });
    assignmentRepository.update.mockResolvedValue({
      id: 'assignment-id',
      status: AssignmentStatus.REMOVED,
    });

    await expect(service.remove('assignment-id')).resolves.toEqual({
      id: 'assignment-id',
      status: AssignmentStatus.REMOVED,
    });
    expect(assignmentRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'assignment-id',
      },
      data: {
        status: AssignmentStatus.REMOVED,
      },
    });
  });
});
