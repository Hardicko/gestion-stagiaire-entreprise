import 'reflect-metadata';

import {
  ForbiddenException,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../prisma/prisma.service';
import { AuthController } from '../auth.controller';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/password-change/allow-password-change-required.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import {
  ACCESS_TOKEN_EXPIRED_CODE,
  ACCESS_TOKEN_INVALID_CODE,
  ACCOUNT_UNAVAILABLE_CODE,
  JwtAuthGuard,
  PASSWORD_CHANGE_REQUIRED_CODE,
  TOKEN_REVOKED_CODE,
} from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const verifyAsync = jest.fn();
  const getAllAndOverride = jest.fn();
  const authSessionRepository = {
    findUnique: jest.fn(),
  };
  const jwtService = { verifyAsync } as unknown as JwtService;
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const prisma = {
    authSession: authSessionRepository,
  } as unknown as PrismaService;

  const userId = '22222222-2222-4222-8222-222222222222';
  const employeeId = '11111111-1111-4111-8111-111111111111';
  const sessionId = '55555555-5555-4555-8555-555555555555';
  const passwordChangedAt = new Date('2026-08-21T09:30:15.123Z');

  const validPayload: JwtPayload = {
    sub: userId,
    sessionId,
    employeeId,
    email: 'ancien-email@example.com',
    role: 'UTILISATEUR',
    passwordChangedAt: passwordChangedAt.getTime(),
    iat: 1_776_935_415,
    exp: 1_776_936_315,
  };

  const activeSession = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: userId,
      employeeId,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt,
      employee: {
        email: 'utilisateur@entreprise.ml',
        isActive: true,
      },
      role: {
        name: 'ADMINISTRATEUR',
        isActive: true,
        rolePermissions: [
          { permission: { code: 'projects.read' } },
          { permission: { code: 'dashboard.read' } },
        ],
      },
    },
  };

  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllAndOverride.mockReturnValue(false);
    guard = new JwtAuthGuard(jwtService, prisma, reflector);
  });

  function createContext(authorization?: string) {
    const request = {
      headers: {
        ...(authorization !== undefined && { authorization }),
      },
    } as Request & { user?: JwtPayload };
    const handler = jest.fn();
    class TestController {}

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => undefined,
        getNext: () => undefined,
      }),
      getHandler: () => handler,
      getClass: () => TestController,
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('refuse une requête sans jeton', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyAsync).not.toHaveBeenCalled();
    expect(authSessionRepository.findUnique).not.toHaveBeenCalled();
  });

  it('distingue un jeton invalide d’un jeton expiré', async () => {
    verifyAsync.mockRejectedValueOnce(new Error('signature invalide'));
    const invalidContext = createContext('Bearer jeton-invalide');

    await expect(
      guard.canActivate(invalidContext.context),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCESS_TOKEN_INVALID_CODE,
      }),
    });

    const expiredError = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';
    verifyAsync.mockRejectedValueOnce(expiredError);
    const expiredContext = createContext('Bearer jeton-expire');

    await expect(
      guard.canActivate(expiredContext.context),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCESS_TOKEN_EXPIRED_CODE,
      }),
    });
    expect(authSessionRepository.findUnique).not.toHaveBeenCalled();
  });

  it('refuse un JWT sans identifiant de session avant tout accès à Prisma', async () => {
    const { sessionId: _sessionId, ...payloadWithoutSession } = validPayload;
    verifyAsync.mockResolvedValue(payloadWithoutSession);
    const { context } = createContext('Bearer ancien-jeton');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCESS_TOKEN_INVALID_CODE,
      }),
    });
    expect(authSessionRepository.findUnique).not.toHaveBeenCalled();
  });

  it('autorise une session active et recharge le rôle depuis MySQL', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    authSessionRepository.findUnique.mockResolvedValue(activeSession);
    const { context, request } = createContext('Bearer jeton-valide');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authSessionRepository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: sessionId,
        },
      }),
    );
    expect(request.user).toEqual(
      expect.objectContaining({
        sub: userId,
        sessionId,
        employeeId,
        email: 'utilisateur@entreprise.ml',
        role: 'ADMINISTRATEUR',
        permissions: ['projects.read', 'dashboard.read'],
        passwordChangedAt: passwordChangedAt.getTime(),
      }),
    );
  });

  it('rejette immédiatement une session révoquée par logout', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      revokedAt: new Date(),
    });
    const { context } = createContext('Bearer jeton-deconnecte');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: TOKEN_REVOKED_CODE,
        statusCode: 401,
      }),
    });
  });

  it('rejette une session expirée ou liée à un autre utilisateur', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    authSessionRepository.findUnique.mockResolvedValueOnce({
      ...activeSession,
      expiresAt: new Date(Date.now() - 1_000),
    });
    const expiredContext = createContext('Bearer session-expiree');

    await expect(
      guard.canActivate(expiredContext.context),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: TOKEN_REVOKED_CODE,
      }),
    });

    authSessionRepository.findUnique.mockResolvedValueOnce({
      ...activeSession,
      userId: '99999999-9999-4999-8999-999999999999',
    });
    const foreignContext = createContext('Bearer session-etrangere');

    await expect(
      guard.canActivate(foreignContext.context),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: TOKEN_REVOKED_CODE,
      }),
    });
  });

  it('bloque les autres routes lorsqu’un changement de mot de passe est obligatoire', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: null,
    });
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      user: {
        ...activeSession.user,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
    });
    const { context } = createContext('Bearer jeton-premiere-connexion');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: expect.objectContaining({
        code: PASSWORD_CHANGE_REQUIRED_CODE,
        statusCode: 403,
      }),
    });
  });

  it('autorise les routes prévues pour terminer la première connexion', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: null,
    });
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      user: {
        ...activeSession.user,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
    });
    getAllAndOverride.mockReturnValue(true);
    const { context } = createContext('Bearer jeton-premiere-connexion');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('invalide un JWT émis avant une modification du mot de passe', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: new Date('2026-08-20T08:00:00.000Z').getTime(),
    });
    authSessionRepository.findUnique.mockResolvedValue(activeSession);
    const { context } = createContext('Bearer ancien-jeton');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: TOKEN_REVOKED_CODE,
        statusCode: 401,
      }),
    });
  });

  it('refuse un compte, un employé ou un rôle devenu inactif', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    authSessionRepository.findUnique.mockResolvedValue({
      ...activeSession,
      user: {
        ...activeSession.user,
        employee: {
          ...activeSession.user.employee,
          isActive: false,
        },
      },
    });
    const { context } = createContext('Bearer jeton-compte-inactif');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCOUNT_UNAVAILABLE_CODE,
        statusCode: 401,
      }),
    });
  });

  it('marque uniquement le profil et le changement de mot de passe comme routes autorisées', () => {
    expect(
      Reflect.getMetadata(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        AuthController.prototype.getProfile,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        AuthController.prototype.changePassword,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        AuthController.prototype.login,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        AuthController.prototype.refresh,
      ),
    ).toBeUndefined();
  });
});
