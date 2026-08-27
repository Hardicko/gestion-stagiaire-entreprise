import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AuditAction, AuditOutcome } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const auditLogRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = {
    auditLog: auditLogRepository,
  } as unknown as PrismaService;

  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(prisma);
  });

  it('enregistre un événement et tronque les champs techniques trop longs', async () => {
    auditLogRepository.create.mockResolvedValue({ id: 'audit-1' });

    await service.recordSafely({
      userId: null,
      action: AuditAction.CREATE,
      outcome: AuditOutcome.SUCCESS,
      resource: 'r'.repeat(110),
      entityLabel: 'e'.repeat(270),
      method: 'POST-TOO-LONG',
      path: `/${'p'.repeat(510)}`,
      statusCode: 201,
      ipAddress: '1'.repeat(50),
      userAgent: 'a'.repeat(510),
      metadata: { source: 'test' },
    });

    const data = auditLogRepository.create.mock.calls[0][0].data;
    expect(data.resource).toHaveLength(100);
    expect(data.entityLabel).toHaveLength(255);
    expect(data.method).toHaveLength(10);
    expect(data.path).toHaveLength(500);
    expect(data.ipAddress).toHaveLength(45);
    expect(data.userAgent).toHaveLength(500);
    expect(data.metadata).toEqual({ source: 'test' });
  });

  it('ne bloque pas la requête métier lorsque le stockage du journal échoue', async () => {
    auditLogRepository.create.mockRejectedValue(new Error('Base indisponible'));

    await expect(
      service.recordSafely({
        action: AuditAction.UPDATE,
        outcome: AuditOutcome.FAILURE,
        resource: 'projects',
        method: 'PATCH',
        path: '/projects/project-1',
        statusCode: 500,
      }),
    ).resolves.toBeUndefined();
  });

  it('retourne une page filtrée du journal', async () => {
    auditLogRepository.findMany.mockResolvedValue([{ id: 'audit-1' }]);
    auditLogRepository.count.mockResolvedValue(21);

    const result = await service.findAll({
      page: 2,
      limit: 10,
      action: AuditAction.LOGIN,
      outcome: AuditOutcome.FAILURE,
      resource: ' auth ',
      userId: '78a44ded-57da-4df0-b5cd-0610593949c8',
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-31T23:59:59.999Z',
    });

    expect(auditLogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          action: AuditAction.LOGIN,
          outcome: AuditOutcome.FAILURE,
          resource: 'auth',
          userId: '78a44ded-57da-4df0-b5cd-0610593949c8',
          createdAt: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lte: new Date('2026-08-31T23:59:59.999Z'),
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toEqual({
      items: [{ id: 'audit-1' }],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });
  });

  it('signale un identifiant d’audit introuvable', async () => {
    auditLogRepository.findUnique.mockResolvedValue(null);

    await expect(service.findOne('audit-unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
