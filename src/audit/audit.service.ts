import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import { AuditAction, AuditOutcome } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface AuditEventInput {
  userId?: string | null;
  action: AuditAction;
  outcome: AuditOutcome;
  resource: string;
  resourceId?: string | null;
  entityLabel?: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  private readonly auditSelect = {
    id: true,
    userId: true,
    action: true,
    outcome: true,
    resource: true,
    resourceId: true,
    entityLabel: true,
    method: true,
    path: true,
    statusCode: true,
    ipAddress: true,
    userAgent: true,
    metadata: true,
    createdAt: true,
    user: {
      select: {
        id: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async recordSafely(event: AuditEventInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: event.userId ?? null,
          action: event.action,
          outcome: event.outcome,
          resource: event.resource.slice(0, 100),
          resourceId: event.resourceId ?? null,
          entityLabel: event.entityLabel?.slice(0, 255) ?? null,
          method: event.method.slice(0, 10),
          path: event.path.slice(0, 500),
          statusCode: event.statusCode,
          ipAddress: event.ipAddress?.slice(0, 45) ?? null,
          userAgent: event.userAgent?.slice(0, 500) ?? null,
          ...(event.metadata !== undefined && {
            metadata: event.metadata as Prisma.InputJsonValue,
          }),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur d'audit inconnue";
      this.logger.error(
        `Échec de l'enregistrement d'audit pour ${event.method} ${event.path}: ${message}`,
      );
    }
  }

  async findAll(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action !== undefined && { action: query.action }),
      ...(query.outcome !== undefined && { outcome: query.outcome }),
      ...(query.resource !== undefined && {
        resource: query.resource.trim(),
      }),
      ...(query.userId !== undefined && { userId: query.userId }),
      ...((query.dateFrom !== undefined || query.dateTo !== undefined) && {
        createdAt: {
          ...(query.dateFrom !== undefined && {
            gte: new Date(query.dateFrom),
          }),
          ...(query.dateTo !== undefined && {
            lte: new Date(query.dateTo),
          }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: this.auditSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      select: this.auditSelect,
    });

    if (!auditLog) {
      throw new NotFoundException("Événement d'audit introuvable.");
    }

    return auditLog;
  }
}
