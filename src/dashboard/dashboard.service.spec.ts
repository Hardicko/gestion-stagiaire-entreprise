import 'reflect-metadata';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  AuditAction,
  InternshipStatus,
  ProjectStatus,
} from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const internRepository = {
    count: jest.fn(),
    findMany: jest.fn(),
  };
  const supervisorRepository = {
    count: jest.fn(),
  };
  const departmentRepository = {
    count: jest.fn(),
  };
  const internshipRepository = {
    groupBy: jest.fn(),
  };
  const projectRepository = {
    groupBy: jest.fn(),
  };
  const auditLogRepository = {
    findMany: jest.fn(),
  };

  const prisma = {
    intern: internRepository,
    supervisor: supervisorRepository,
    department: departmentRepository,
    internship: internshipRepository,
    project: projectRepository,
    auditLog: auditLogRepository,
  } as unknown as PrismaService;

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-20T12:00:00.000Z'));
    service = new DashboardService(prisma);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retourne le résumé et les activités provenant du journal d’audit', async () => {
    internRepository.count.mockResolvedValueOnce(67).mockResolvedValueOnce(3);
    supervisorRepository.count.mockResolvedValue(8);
    departmentRepository.count.mockResolvedValue(5);
    internshipRepository.groupBy.mockResolvedValue([
      { status: InternshipStatus.PLANNED, _count: { _all: 4 } },
      { status: InternshipStatus.ONGOING, _count: { _all: 12 } },
      { status: InternshipStatus.COMPLETED, _count: { _all: 30 } },
    ]);
    projectRepository.groupBy.mockResolvedValue([
      { status: ProjectStatus.ONGOING, _count: { _all: 6 } },
      { status: ProjectStatus.COMPLETED, _count: { _all: 4 } },
    ]);
    internRepository.findMany.mockResolvedValue([
      {
        id: 'intern-1',
        registrationCode: 'STG-001',
        firstName: 'Awa',
        lastName: 'Traoré',
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
        internships: [
          {
            id: 'internship-1',
            status: InternshipStatus.ONGOING,
            startDate: new Date('2026-08-01T00:00:00.000Z'),
            endDate: new Date('2026-10-31T00:00:00.000Z'),
            department: {
              id: 'department-1',
              name: 'Informatique',
              code: 'IT',
            },
          },
        ],
      },
    ]);
    auditLogRepository.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        action: AuditAction.CREATE,
        resource: 'projects',
        resourceId: 'project-1',
        entityLabel: 'Portail interne',
        createdAt: new Date('2026-08-20T11:00:00.000Z'),
        user: {
          id: 'user-1',
          employee: {
            firstName: 'Moussa',
            lastName: 'Diallo',
          },
        },
      },
      {
        id: 'audit-2',
        action: AuditAction.LOGIN,
        resource: 'auth',
        resourceId: null,
        entityLabel: null,
        createdAt: new Date('2026-08-20T09:00:00.000Z'),
        user: null,
      },
    ]);

    const result = await service.getDashboard();

    expect(result.generatedAt).toEqual(new Date('2026-08-20T12:00:00.000Z'));
    expect(result.summary).toEqual({
      activeInterns: 67,
      internsAddedThisMonth: 3,
      activeInternships: 46,
      ongoingInternships: 12,
      activeProjects: 10,
      ongoingProjects: 6,
      activeSupervisors: 8,
      activeDepartments: 5,
    });
    expect(result.statusBreakdown.internships.CANCELLED).toBe(0);
    expect(result.statusBreakdown.projects.ON_HOLD).toBe(0);
    expect(result.recentInterns[0]).toEqual(
      expect.objectContaining({
        id: 'intern-1',
        fullName: 'Awa Traoré',
        latestInternship: expect.objectContaining({
          status: InternshipStatus.ONGOING,
        }),
      }),
    );
    expect(result.recentActivities).toEqual([
      expect.objectContaining({
        id: 'audit-1',
        action: AuditAction.CREATE,
        resource: 'projects',
        entityLabel: 'Portail interne',
        actor: {
          id: 'user-1',
          firstName: 'Moussa',
          lastName: 'Diallo',
          fullName: 'Moussa Diallo',
        },
      }),
      expect.objectContaining({
        id: 'audit-2',
        action: AuditAction.LOGIN,
        actor: null,
      }),
    ]);
    expect(auditLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { outcome: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    );
    expect(internRepository.count).toHaveBeenNthCalledWith(2, {
      where: {
        isActive: true,
        createdAt: { gte: new Date('2026-08-01T00:00:00.000Z') },
      },
    });
  });

  it('retourne des compteurs et des listes vides lorsque la base est vide', async () => {
    internRepository.count.mockResolvedValue(0);
    supervisorRepository.count.mockResolvedValue(0);
    departmentRepository.count.mockResolvedValue(0);
    internshipRepository.groupBy.mockResolvedValue([]);
    projectRepository.groupBy.mockResolvedValue([]);
    internRepository.findMany.mockResolvedValue([]);
    auditLogRepository.findMany.mockResolvedValue([]);

    const result = await service.getDashboard();

    expect(result.summary).toEqual({
      activeInterns: 0,
      internsAddedThisMonth: 0,
      activeInternships: 0,
      ongoingInternships: 0,
      activeProjects: 0,
      ongoingProjects: 0,
      activeSupervisors: 0,
      activeDepartments: 0,
    });
    expect(result.recentInterns).toEqual([]);
    expect(result.recentActivities).toEqual([]);
  });
});
