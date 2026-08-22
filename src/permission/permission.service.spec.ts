jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  const permissionRepository = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = {
    permission: permissionRepository,
  } as unknown as PrismaService;

  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(prisma);
  });

  it('liste uniquement les permissions actives par catégorie et code', async () => {
    permissionRepository.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(permissionRepository.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  });

  it('signale une permission introuvable', async () => {
    permissionRepository.findUnique.mockResolvedValue(null);

    await expect(service.findOne('permission-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
