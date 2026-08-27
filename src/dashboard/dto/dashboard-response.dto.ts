import { ApiProperty } from '@nestjs/swagger';

import {
  AuditAction,
  InternshipStatus,
  ProjectStatus,
} from '../../generated/prisma/enums';

export class DashboardSummaryDto {
  activeInterns: number;
  internsAddedThisMonth: number;
  activeInternships: number;
  ongoingInternships: number;
  activeProjects: number;
  ongoingProjects: number;
  activeSupervisors: number;
  activeDepartments: number;
}

export class InternshipStatusBreakdownDto {
  PLANNED: number;
  ONGOING: number;
  COMPLETED: number;
  CANCELLED: number;
}

export class ProjectStatusBreakdownDto {
  PLANNED: number;
  ONGOING: number;
  COMPLETED: number;
  CANCELLED: number;
  ON_HOLD: number;
}

export class DashboardStatusBreakdownDto {
  internships: InternshipStatusBreakdownDto;
  projects: ProjectStatusBreakdownDto;
}

export class DashboardDepartmentDto {
  id: string;
  name: string;
  code: string;
}

export class DashboardLatestInternshipDto {
  id: string;

  @ApiProperty({ enum: InternshipStatus })
  status: InternshipStatus;

  startDate: Date;
  endDate: Date;
  department: DashboardDepartmentDto;
}

export class DashboardRecentInternDto {
  id: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  createdAt: Date;

  @ApiProperty({ type: DashboardLatestInternshipDto, nullable: true })
  latestInternship: DashboardLatestInternshipDto | null;
}

export class DashboardActivityActorDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export class DashboardTrackingInternDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export class DashboardTrackingSupervisorDto {
  id: string;
  fullName: string;
}

export class DashboardTrackingProjectDto {
  id: string;
  name: string;

  @ApiProperty({ enum: ProjectStatus })
  status: ProjectStatus;
}

export class DashboardInternshipTrackingDto {
  id: string;
  title: string;

  @ApiProperty({ enum: InternshipStatus })
  status: InternshipStatus;

  startDate: Date;
  endDate: Date;
  intern: DashboardTrackingInternDto;
  department: DashboardDepartmentDto;
  supervisor: DashboardTrackingSupervisorDto;

  @ApiProperty({ type: DashboardTrackingProjectDto, nullable: true })
  project: DashboardTrackingProjectDto | null;
}

export class DashboardActivityDto {
  id: string;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  resource: string;
  resourceId: string | null;
  entityLabel: string | null;
  occurredAt: Date;

  @ApiProperty({ type: DashboardActivityActorDto, nullable: true })
  actor: DashboardActivityActorDto | null;
}

export class DashboardResponseDto {
  generatedAt: Date;
  summary: DashboardSummaryDto;
  statusBreakdown: DashboardStatusBreakdownDto;

  @ApiProperty({ type: [DashboardRecentInternDto] })
  recentInterns: DashboardRecentInternDto[];

  @ApiProperty({ type: [DashboardInternshipTrackingDto] })
  internshipTracking: DashboardInternshipTrackingDto[];

  @ApiProperty({ type: [DashboardActivityDto] })
  recentActivities: DashboardActivityDto[];
}

export const EMPTY_INTERNSHIP_STATUS_BREAKDOWN: InternshipStatusBreakdownDto = {
  PLANNED: 0,
  ONGOING: 0,
  COMPLETED: 0,
  CANCELLED: 0,
};

export const EMPTY_PROJECT_STATUS_BREAKDOWN: ProjectStatusBreakdownDto = {
  PLANNED: 0,
  ONGOING: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  ON_HOLD: 0,
};

export const PROJECT_STATUS_VALUES: ProjectStatus[] = [
  ProjectStatus.PLANNED,
  ProjectStatus.ONGOING,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
  ProjectStatus.ON_HOLD,
];
