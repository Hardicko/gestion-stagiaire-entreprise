import 'reflect-metadata';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ProjectStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  const departmentRepository = {
    findFirst: jest.fn(),
  };
  const projectRepository = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const projectAssignmentRepository = {
    count: jest.fn(),
  };

  const prisma = {
    department: departmentRepository,
    project: projectRepository,
    projectAssignment: projectAssignmentRepository,
  } as unknown as PrismaService;

  let service: ProjectService;

  const validDto: CreateProjectDto = {
    projectCode: ' prj-001 ',
    name: ' Portail de gestion ',
    description: ' Application interne ',
    gitlabLink: ' https://gitlab.example.com/entreprise/portail ',
    startDate: '2026-09-01',
    endDate: '2027-01-31',
    departmentId: 'department-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService(prisma);
  });

  it('crée et normalise un projet', async () => {
    departmentRepository.findFirst.mockResolvedValue({
      id: 'department-id',
    });
    projectRepository.findUnique.mockResolvedValue(null);
    projectRepository.create.mockResolvedValue({ id: 'project-id' });

    await expect(service.create(validDto)).resolves.toEqual({
      id: 'project-id',
    });
    expect(projectRepository.create).toHaveBeenCalledWith({
      data: {
        projectCode: 'PRJ-001',
        name: 'Portail de gestion',
        description: 'Application interne',
        gitlabLink: 'https://gitlab.example.com/entreprise/portail',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: ProjectStatus.PLANNED,
        departmentId: 'department-id',
        isActive: true,
      },
      include: {
        department: true,
      },
    });
  });

  it('refuse une date de fin antérieure à la date de début', async () => {
    await expect(
      service.create({
        ...validDto,
        startDate: '2027-01-31',
        endDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(departmentRepository.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un département introuvable ou inactif', async () => {
    departmentRepository.findFirst.mockResolvedValue(null);

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it('refuse un code projet déjà utilisé', async () => {
    departmentRepository.findFirst.mockResolvedValue({
      id: 'department-id',
    });
    projectRepository.findUnique.mockResolvedValue({
      id: 'existing-project',
    });

    await expect(service.create(validDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it('retourne les projets actifs avec le nombre d’affectations', async () => {
    projectRepository.findMany.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(projectRepository.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      include: {
        department: true,
        _count: {
          select: {
            projectAssignments: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  });

  it('permet de vider le lien GitLab et la description', async () => {
    projectRepository.findUnique.mockResolvedValue({
      id: 'project-id',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-01-31'),
      status: ProjectStatus.PLANNED,
      isActive: true,
    });
    projectRepository.update.mockResolvedValue({ id: 'project-id' });

    await service.update('project-id', {
      description: null,
      gitlabLink: null,
    });

    expect(projectRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'project-id',
      },
      data: {
        description: null,
        gitlabLink: null,
      },
      include: {
        department: true,
      },
    });
  });

  it('refuse la désactivation d’un projet en cours', async () => {
    projectRepository.findUnique.mockResolvedValue({
      id: 'project-id',
      status: ProjectStatus.ONGOING,
      isActive: true,
    });

    await expect(service.remove('project-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(projectAssignmentRepository.count).not.toHaveBeenCalled();
  });

  it('refuse la désactivation avec des affectations actives', async () => {
    projectRepository.findUnique.mockResolvedValue({
      id: 'project-id',
      status: ProjectStatus.PLANNED,
      isActive: true,
    });
    projectAssignmentRepository.count.mockResolvedValue(1);

    await expect(service.remove('project-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(projectRepository.update).not.toHaveBeenCalled();
  });

  it('désactive un projet sans affectation active', async () => {
    projectRepository.findUnique.mockResolvedValue({
      id: 'project-id',
      status: ProjectStatus.COMPLETED,
      isActive: true,
    });
    projectAssignmentRepository.count.mockResolvedValue(0);
    projectRepository.update.mockResolvedValue({
      id: 'project-id',
      isActive: false,
    });

    await expect(service.remove('project-id')).resolves.toEqual({
      id: 'project-id',
      isActive: false,
    });
    expect(projectRepository.update).toHaveBeenCalledWith({
      where: {
        id: 'project-id',
      },
      data: {
        isActive: false,
      },
      include: {
        department: true,
      },
    });
  });
});
