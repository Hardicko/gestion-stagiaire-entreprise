import { ApiProperty } from '@nestjs/swagger';

import { AuditAction, AuditOutcome } from '../../generated/prisma/enums';

export class AuditActorEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
}

export class AuditActorDto {
  id: string;
  employee: AuditActorEmployeeDto;
}

export class AuditLogResponseDto {
  id: string;
  userId: string | null;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ enum: AuditOutcome })
  outcome: AuditOutcome;

  resource: string;
  resourceId: string | null;
  entityLabel: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;

  @ApiProperty({ type: Object, nullable: true })
  metadata: object | null;

  createdAt: Date;

  @ApiProperty({ type: AuditActorDto, nullable: true })
  user: AuditActorDto | null;
}

export class AuditPaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];

  pagination: AuditPaginationDto;
}
