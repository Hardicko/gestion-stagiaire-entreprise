import { createHash } from 'node:crypto';

import 'reflect-metadata';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { PrismaService } from '../prisma/prisma.service';
import { REFRESH_TOKEN_INVALID_CODE } from './auth.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userRepository = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const authSessionRepository = {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  };
  const transaction = jest.fn();
  const signAsync = jest.fn();
  const get = jest.fn();
  const prisma = {
    user: userRepository,
    authSession: authSessionRepository,
    $transaction: transaction,
  } as unknown as PrismaService;
  const jwtService = { signAsync } as unknown as JwtService;
  const configService = { get } as unknown as ConfigService;

  const userId = '22222222-2222-4222-8222-222222222222';
  const employeeId = '11111111-1111-4111-8111-111111111111';
  const roleId = '33333333-3333-4333-8333-333333333333';
  const sessionId = '55555555-5555-4555-8555-555555555555';
  const passwordChangedAt = new Date('2026-08-21T09:30:15.123Z');
  const sessionCreatedAt = new Date('2026-08-22T08:00:00.000Z');
  const sessionExpiresAt = new Date('2026-08-29T08:00:00.000Z');

  const authenticatedUser = {
    id: userId,
    employeeId,
    roleId,
    passwordHash: 'argon2-hash',
    mustChangePassword: false,
    passwordChangedAt,
    employee: {
      id: employeeId,
      employeeNumber: 'EMP-001',
      firstName: 'Awa',
      lastName: 'Traoré',
      email: 'awa@entreprise.ml',
      jobTitle: 'Développeuse',
      department: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Informatique',
        code: 'IT',
      },
    },
    role: {
      id: roleId,
      name: 'UTILISATEUR',
      rolePermissions: [
        { permission: { code: 'dashboard.read' } },
        { permission: { code: 'projects.read' } },
      ],
    },
  };

  const activeSession = {
    id: sessionId,
    userId,
    createdAt: sessionCreatedAt,
    expiresAt: sessionExpiresAt,
    revokedAt: null,
    user: {
      id: userId,
      employeeId,
      isActive: true,
      passwordChangedAt,
      employee: {
        email: 'awa@entreprise.ml',
        isActive: true,
      },
      role: {
        name: 'UTILISATEUR',
        isActive: true,
      },
    },
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockImplementation((name: string) => {
      if (name === 'JWT_EXPIRES_IN_SECOND') {
        return '900';
      }

      if (name === 'JWT_REFRESH_EXPIRES_IN_SECOND') {
        return '604800';
      }

      return undefined;
    });
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    service = new AuthService(prisma, jwtService, configService);
  });

  it('crée une session hachée et lie le JWT à son identifiant', async () => {
    userRepository.findFirst.mockResolvedValue(authenticatedUser);
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    authSessionRepository.create.mockResolvedValue({ id: sessionId });
    signAsync.mockResolvedValue('jwt-signe');
    userRepository.update.mockResolvedValue({});

    const result = await service.login(
      {
        email: 'awa@entreprise.ml',
        password: 'MotDePasseInitial@2026!',
      },
      {
        ipAddress: '10.172.1.25',
        userAgent: 'Navigateur de test',
      },
    );

    expect(authSessionRepository.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
        ipAddress: '10.172.1.25',
        userAgent: 'Navigateur de test',
      }),
      select: {
        id: true,
      },
    });
    expect(signAsync).toHaveBeenCalledWith({
      sub: userId,
      sessionId,
      employeeId,
      email: 'awa@entreprise.ml',
      role: 'UTILISATEUR',
      passwordChangedAt: passwordChangedAt.getTime(),
    });
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'jwt-signe',
        expiresIn: 900,
        refreshToken: expect.stringMatching(/^[A-Za-z0-9_-]{64}$/),
        refreshExpiresIn: 604800,
        user: expect.objectContaining({
          mustChangePassword: false,
          permissions: ['dashboard.read', 'projects.read'],
        }),
      }),
    );
  });

  it('fait tourner le refresh token et produit un nouveau JWT pour la même session', async () => {
    const currentRefreshToken = 'a'.repeat(64);
    const currentHash = createHash('sha256')
      .update(currentRefreshToken, 'utf8')
      .digest('hex');
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      expiresAt: new Date(Date.now() + 60_000),
    });
    authSessionRepository.updateMany.mockResolvedValue({ count: 1 });
    signAsync.mockResolvedValue('jwt-renouvele');

    const result = await service.refresh(currentRefreshToken, {
      ipAddress: '10.172.1.26',
      userAgent: 'Frontend Angular',
    });

    expect(authSessionRepository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          refreshTokenHash: currentHash,
        },
      }),
    );
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: sessionId,
          refreshTokenHash: currentHash,
          revokedAt: null,
        }),
        data: expect.objectContaining({
          refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          lastUsedAt: expect.any(Date),
          ipAddress: '10.172.1.26',
          userAgent: 'Frontend Angular',
        }),
      }),
    );
    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: userId,
        sessionId,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'jwt-renouvele',
        refreshToken: expect.stringMatching(/^[A-Za-z0-9_-]{64}$/),
      }),
    );
    expect(result.refreshToken).not.toBe(currentRefreshToken);
  });

  it('refuse un refresh token expiré et révoque sa session', async () => {
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      expiresAt: new Date(Date.now() - 1_000),
    });
    authSessionRepository.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.refresh('b'.repeat(64))).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: expect.objectContaining({
        code: REFRESH_TOKEN_INVALID_CODE,
        statusCode: 401,
      }),
    });
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('refuse la réutilisation si la rotation atomique a déjà été consommée', async () => {
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      expiresAt: new Date(Date.now() + 60_000),
    });
    authSessionRepository.updateMany.mockResolvedValue({ count: 0 });
    signAsync.mockResolvedValue('jwt-non-retourne');

    await expect(service.refresh('c'.repeat(64))).rejects.toMatchObject({
      response: expect.objectContaining({
        code: REFRESH_TOKEN_INVALID_CODE,
      }),
    });
  });

  it('révoque immédiatement la session au logout sans stocker le token en clair', async () => {
    const refreshToken = 'd'.repeat(64);
    const expectedHash = createHash('sha256')
      .update(refreshToken, 'utf8')
      .digest('hex');
    authSessionRepository.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.logout(refreshToken)).resolves.toEqual({
      message: 'Déconnexion effectuée avec succès.',
    });
    expect(authSessionRepository.updateMany).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: expectedHash,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('refuse refresh et logout lorsque le refresh token est absent', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.logout(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authSessionRepository.findUnique).not.toHaveBeenCalled();
  });
  it('révoque toutes les sessions après un changement de mot de passe', async () => {
    userRepository.findFirst.mockResolvedValue({
      id: userId,
      passwordHash: 'ancien-hash',
    });
    (argon2.verify as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (argon2.hash as jest.Mock).mockResolvedValue('nouveau-hash');
    userRepository.update.mockResolvedValue({});
    authSessionRepository.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      service.changePassword(userId, {
        currentPassword: 'AncienMotDePasse@2026!',
        newPassword: 'NouveauMotDePasse@2026!',
        confirmNewPassword: 'NouveauMotDePasse@2026!',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        requiresLogin: true,
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
