import 'reflect-metadata';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import * as argon2 from 'argon2';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

describe('UserService', () => {
  const employeeRepository = {
    findFirst: jest.fn(),
  };
  const roleRepository = {
    findFirst: jest.fn(),
  };
  const userRepository = {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const authSessionRepository = {
    updateMany: jest.fn(),
  };
  const transaction = jest.fn();

  const prisma = {
    employee: employeeRepository,
    role: roleRepository,
    user: userRepository,
    authSession: authSessionRepository,
    $transaction: transaction,
  } as unknown as PrismaService;

  const employeeId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const otherUserId = '33333333-3333-4333-8333-333333333333';
  const roleId = '44444444-4444-4444-8444-444444444444';
  const adminRoleId = '55555555-5555-4555-8555-555555555555';
  const password = 'MotDePasseInitial2026!';

  const normalUser = {
    id: userId,
    employeeId,
    roleId,
    mustChangePassword: true,
    passwordChangedAt: null,
    lastLoginAt: null,
    isActive: true,
    createdAt: new Date('2026-08-20'),
    updatedAt: new Date('2026-08-20'),
    employee: {
      id: employeeId,
      employeeNumber: 'EMP-001',
      firstName: 'Awa',
      lastName: 'Traoré',
      email: 'awa@example.com',
      position: {
        id: 'position-id',
        code: 'ASSISTANT_ADMINISTRATIF',
        name: 'Assistante administrative',
      },
      isActive: true,
      department: {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Informatique',
        code: 'IT',
      },
    },
    role: {
      id: roleId,
      name: 'UTILISATEUR',
      description: null,
      isActive: true,
    },
  };

  const administrator = {
    ...normalUser,
    roleId: adminRoleId,
    role: {
      id: adminRoleId,
      name: 'ADMINISTRATEUR',
      description: null,
      isActive: true,
    },
  };

  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    authSessionRepository.updateMany.mockResolvedValue({ count: 1 });
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    service = new UserService(prisma);
  });

  it('crée un utilisateur, hache son mot de passe et ne sélectionne aucun secret', async () => {
    const dto: CreateUserDto = {
      employeeId,
      roleId,
      password,
      confirmPassword: password,
    };

    employeeRepository.findFirst.mockResolvedValue({ id: employeeId });
    roleRepository.findFirst.mockResolvedValue({
      id: roleId,
      name: 'UTILISATEUR',
    });
    userRepository.findUnique.mockResolvedValue(null);
    (argon2.hash as jest.Mock).mockResolvedValue('argon2-hash');
    userRepository.create.mockResolvedValue(normalUser);

    await expect(service.create(dto)).resolves.toEqual(normalUser);

    expect(roleRepository.findFirst).toHaveBeenCalledWith({
      where: {
        id: roleId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
    expect(argon2.hash).toHaveBeenCalledWith(password, {
      type: argon2.argon2id,
    });
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          employeeId,
          roleId,
          passwordHash: 'argon2-hash',
          mustChangePassword: true,
          isActive: true,
        },
      }),
    );

    const select = userRepository.create.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('passwordHash');
    expect(select).not.toHaveProperty('refreshTokenHash');
  });

  it('refuse deux mots de passe différents avant tout accès à la base', async () => {
    await expect(
      service.create({
        employeeId,
        roleId,
        password,
        confirmPassword: 'AutreMotDePasse2026!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(employeeRepository.findFirst).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('refuse un employé introuvable ou inactif', async () => {
    employeeRepository.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        employeeId,
        roleId,
        password,
        confirmPassword: password,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('refuse la création d’un second compte pour le même employé', async () => {
    employeeRepository.findFirst.mockResolvedValue({ id: employeeId });
    roleRepository.findFirst.mockResolvedValue({
      id: roleId,
      name: 'UTILISATEUR',
    });
    userRepository.findUnique.mockResolvedValue({ id: userId });

    await expect(
      service.create({
        employeeId,
        roleId,
        password,
        confirmPassword: password,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('liste les utilisateurs sans demander les champs secrets', async () => {
    userRepository.findMany.mockResolvedValue([normalUser]);

    await expect(service.findAll()).resolves.toEqual([normalUser]);

    const query = userRepository.findMany.mock.calls[0][0];
    expect(query.orderBy).toEqual({ employee: { lastName: 'asc' } });
    expect(query.select).not.toHaveProperty('passwordHash');
    expect(query.select).not.toHaveProperty('refreshTokenHash');
  });

  it('refuse qu’un administrateur désactive son propre compte', async () => {
    userRepository.findUnique.mockResolvedValue(administrator);

    await expect(
      service.update(userId, { isActive: false }, userId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.count).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('protège le dernier administrateur contre la désactivation', async () => {
    userRepository.findUnique.mockResolvedValue(administrator);
    userRepository.count.mockResolvedValue(0);

    await expect(
      service.update(userId, { isActive: false }, otherUserId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.count).toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('protège le dernier administrateur contre la rétrogradation', async () => {
    userRepository.findUnique.mockResolvedValue(administrator);
    roleRepository.findFirst.mockResolvedValue({
      id: roleId,
      name: 'UTILISATEUR',
    });
    userRepository.count.mockResolvedValue(0);

    await expect(
      service.update(userId, { roleId }, otherUserId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('modifie le rôle lorsque le rôle cible est autorisé et actif', async () => {
    userRepository.findUnique.mockResolvedValue(normalUser);
    roleRepository.findFirst.mockResolvedValue({
      id: adminRoleId,
      name: 'ADMINISTRATEUR',
    });
    userRepository.update.mockResolvedValue({
      ...normalUser,
      roleId: adminRoleId,
    });

    await service.update(userId, { roleId: adminRoleId }, otherUserId);

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { roleId: adminRoleId },
      }),
    );
  });

  it('révoque les sessions lors de la désactivation via PATCH', async () => {
    userRepository.findUnique.mockResolvedValue(normalUser);
    userRepository.update.mockResolvedValue({
      ...normalUser,
      isActive: false,
    });

    await expect(
      service.update(userId, { isActive: false }, otherUserId),
    ).resolves.toEqual(
      expect.objectContaining({
        isActive: false,
      }),
    );

    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(transaction).toHaveBeenCalled();
  });

  it('refuse de réutiliser le mot de passe actuel lors d’une réinitialisation', async () => {
    userRepository.findUnique.mockResolvedValue({
      id: userId,
      passwordHash: 'old-hash',
      isActive: true,
    });
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    await expect(
      service.resetPassword(userId, {
        newPassword: password,
        confirmNewPassword: password,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('réinitialise le mot de passe et invalide le refresh token', async () => {
    const newPassword = 'NouveauMotDePasse2026!';
    userRepository.findUnique.mockResolvedValue({
      id: userId,
      passwordHash: 'old-hash',
      isActive: true,
    });
    (argon2.verify as jest.Mock).mockResolvedValue(false);
    (argon2.hash as jest.Mock).mockResolvedValue('new-hash');
    userRepository.update.mockResolvedValue(normalUser);

    await service.resetPassword(userId, {
      newPassword,
      confirmNewPassword: newPassword,
      mustChangePassword: false,
    });

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: {
          passwordHash: 'new-hash',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
          refreshTokenHash: null,
        },
      }),
    );
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(transaction).toHaveBeenCalled();
  });

  it('refuse la réinitialisation d’un compte désactivé', async () => {
    userRepository.findUnique.mockResolvedValue({
      id: userId,
      passwordHash: 'old-hash',
      isActive: false,
    });

    await expect(
      service.resetPassword(userId, {
        newPassword: password,
        confirmNewPassword: password,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it('refuse la désactivation de son propre compte via DELETE', async () => {
    await expect(service.remove(userId, userId)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(userRepository.findUnique).not.toHaveBeenCalled();
  });

  it('refuse la désactivation répétée d’un compte', async () => {
    userRepository.findUnique.mockResolvedValue({
      ...normalUser,
      isActive: false,
    });

    await expect(service.remove(userId, otherUserId)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('désactive un utilisateur simple et invalide son refresh token', async () => {
    userRepository.findUnique.mockResolvedValue(normalUser);
    userRepository.update.mockResolvedValue({
      ...normalUser,
      isActive: false,
    });

    await service.remove(userId, otherUserId);

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: {
          isActive: false,
          refreshTokenHash: null,
        },
      }),
    );
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(transaction).toHaveBeenCalled();
  });
});
