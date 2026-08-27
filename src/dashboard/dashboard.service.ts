import { Injectable } from '@nestjs/common';

import { AuditOutcome } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardActivityDto,
  DashboardInternshipTrackingDto,
  DashboardRecentInternDto,
  DashboardResponseDto,
  EMPTY_INTERNSHIP_STATUS_BREAKDOWN,
  EMPTY_PROJECT_STATUS_BREAKDOWN,
  InternshipStatusBreakdownDto,
  ProjectStatusBreakdownDto,
} from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<DashboardResponseDto> {
    const generatedAt = new Date();
    const startOfMonth = new Date(
      Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth(), 1),
    );

    const [
      activeInterns,
      internsAddedThisMonth,
      activeSupervisors,
      activeDepartments,
      internshipStatusRows,
      projectStatusRows,
      recentInternRows,
      recentAuditRows,
    ] = await Promise.all([
      this.prisma.intern.count({ where: { isActive: true } }),
      this.prisma.intern.count({
        where: {
          isActive: true,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.supervisor.count({
        where: {
          isActive: true,
          employee: {
            is: { isActive: true },
          },
        },
      }),
      this.prisma.department.count({ where: { isActive: true } }),
      this.prisma.internship.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.intern.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          registrationCode: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          internships: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { outcome: AuditOutcome.SUCCESS },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          entityLabel: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const recentInternshipRows = await this.prisma.internship.findMany({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        intern: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        projectAssignments: {
          where: {
            status: {
              not: 'REMOVED',
            },
          },
          orderBy: { assignedAt: 'desc' },
          take: 1,
          select: {
            project: {
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    });

    const internshipStatuses: InternshipStatusBreakdownDto = {
      ...EMPTY_INTERNSHIP_STATUS_BREAKDOWN,
    };
    for (const row of internshipStatusRows) {
      internshipStatuses[row.status] = row._count._all;
    }

    const projectStatuses: ProjectStatusBreakdownDto = {
      ...EMPTY_PROJECT_STATUS_BREAKDOWN,
    };
    for (const row of projectStatusRows) {
      projectStatuses[row.status] = row._count._all;
    }

    const recentInterns: DashboardRecentInternDto[] = recentInternRows.map(
      ({ internships, ...intern }) => ({
        ...intern,
        fullName: `${intern.firstName} ${intern.lastName}`,
        latestInternship: internships[0] ?? null,
      }),
    );

    const internshipTracking: DashboardInternshipTrackingDto[] =
      recentInternshipRows.map(
        ({ intern, supervisor, projectAssignments, ...internship }) => ({
          ...internship,
          intern: {
            ...intern,
            fullName: `${intern.firstName} ${intern.lastName}`,
          },
          supervisor: {
            id: supervisor.id,
            fullName: `${supervisor.employee.firstName} ${supervisor.employee.lastName}`,
          },
          project: projectAssignments[0]?.project ?? null,
        }),
      );

    const recentActivities: DashboardActivityDto[] = recentAuditRows.map(
      (auditLog) => {
        const employee = auditLog.user?.employee;

        return {
          id: auditLog.id,
          action: auditLog.action,
          resource: auditLog.resource,
          resourceId: auditLog.resourceId,
          entityLabel: auditLog.entityLabel,
          occurredAt: auditLog.createdAt,
          actor:
            auditLog.user && employee
              ? {
                  id: auditLog.user.id,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  fullName: `${employee.firstName} ${employee.lastName}`,
                }
              : null,
        };
      },
    );

    const activeInternships =
      internshipStatuses.PLANNED +
      internshipStatuses.ONGOING +
      internshipStatuses.COMPLETED +
      internshipStatuses.CANCELLED;
    const activeProjects =
      projectStatuses.PLANNED +
      projectStatuses.ONGOING +
      projectStatuses.COMPLETED +
      projectStatuses.CANCELLED +
      projectStatuses.ON_HOLD;

    return {
      generatedAt,
      summary: {
        activeInterns,
        internsAddedThisMonth,
        activeInternships,
        ongoingInternships: internshipStatuses.ONGOING,
        activeProjects,
        ongoingProjects: projectStatuses.ONGOING,
        activeSupervisors,
        activeDepartments,
      },
      statusBreakdown: {
        internships: internshipStatuses,
        projects: projectStatuses,
      },
      recentInterns,
      internshipTracking,
      recentActivities,
    };
  }
}
