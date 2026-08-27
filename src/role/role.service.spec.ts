import { BadRequestException, ConflictException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { RoleService } from './role.service';

describe('RoleService', () => {
  const roleRepository = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const permissionRepository = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const rolePermissionRepository = {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
  const userRepository = {
    count: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    role: roleRepository,
    permission: permissionRepository,
    rolePermission: rolePermissionRepository,
    user: userRepository,
    $transaction: transaction,
  } as unknown as PrismaService;

  const roleId = '11111111-1111-4111-8111-111111111111';
  const permissionId = '22222222-2222-4222-8222-222222222222';
  const role = {
    id: roleId,
    name: 'RH',
    description: 'Ressources humaines',
    isActive: true,
    createdAt: new Date('2026-08-22'),
    updatedAt: new Date('2026-08-22'),
    rolePermissions: [],
  };

  let service: RoleService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoleService(prisma);
  });

  it('attribue une liste validée de permissions à un rôle actif', async () => {
    roleRepository.findUnique.mockResolvedValue(role);
    permissionRepository.findMany.mockResolvedValue([{ id: permissionId }]);
    rolePermissionRepository.deleteMany.mockReturnValue({
      operation: 'delete',
    });
    rolePermissionRepository.createMany.mockReturnValue({
      operation: 'create',
    });
    transaction.mockResolvedValue([]);

    await service.setPermissions(roleId, {
      permissionIds: [permissionId],
    });

    expect(transaction).toHaveBeenCalledWith([
      { operation: 'delete' },
      { operation: 'create' },
    ]);
    expect(rolePermissionRepository.createMany).toHaveBeenCalledWith({
      data: [{ roleId, permissionId }],
      skipDuplicates: true,
    });
  });

  it('refuse une permission inconnue ou inactive', async () => {
    roleRepository.findUnique.mockResolvedValue(role);
    permissionRepository.findMany.mockResolvedValue([]);

    await expect(
      service.setPermissions(roleId, {
        permissionIds: [permissionId],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('empêche le retrait d’une permission du rôle administrateur', async () => {
    roleRepository.findUnique.mockResolvedValue({
      ...role,
      name: 'ADMINISTRATEUR',
    });
    permissionRepository.findMany.mockResolvedValue([{ id: permissionId }]);
    permissionRepository.count.mockResolvedValue(2);

    await expect(
      service.setPermissions(roleId, {
        permissionIds: [permissionId],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('empêche la désactivation d’un rôle encore utilisé', async () => {
    roleRepository.findUnique.mockResolvedValue(role);
    userRepository.count.mockResolvedValue(1);

    await expect(service.remove(roleId)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(roleRepository.update).not.toHaveBeenCalled();
  });
});
