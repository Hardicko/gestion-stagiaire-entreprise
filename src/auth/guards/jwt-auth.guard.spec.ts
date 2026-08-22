import 'reflect-metadata';

import {
  ForbiddenException,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AuthController } from '../auth.controller';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/password-change/allow-password-change-required.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ACCOUNT_UNAVAILABLE_CODE,
  JwtAuthGuard,
  PASSWORD_CHANGE_REQUIRED_CODE,
  TOKEN_REVOKED_CODE,
} from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const verifyAsync = jest.fn();
  const getAllAndOverride = jest.fn();
  const userRepository = {
    findUnique: jest.fn(),
  };
  const jwtService = { verifyAsync } as unknown as JwtService;
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const prisma = {
    user: userRepository,
  } as unknown as PrismaService;

  const userId = '22222222-2222-4222-8222-222222222222';
  const employeeId = '11111111-1111-4111-8111-111111111111';
  const passwordChangedAt = new Date('2026-08-21T09:30:15.123Z');

  const validPayload: JwtPayload = {
    sub: userId,
    employeeId,
    email: 'ancien-email@example.com',
    role: 'UTILISATEUR',
    passwordChangedAt: passwordChangedAt.getTime(),
    iat: 1_776_935_415,
    exp: 1_776_936_315,
  };

  const activeAccount = {
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
    expect(userRepository.findUnique).not.toHaveBeenCalled();
  });

  it('refuse un jeton invalide avant tout accès à la base', async () => {
    verifyAsync.mockRejectedValue(new Error('signature invalide'));
    const { context } = createContext('Bearer jeton-invalide');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(userRepository.findUnique).not.toHaveBeenCalled();
  });

  it('autorise un compte actif et remplace les données de rôle par celles de la base', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    userRepository.findUnique.mockResolvedValue(activeAccount);
    const { context, request } = createContext('Bearer jeton-valide');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({
        sub: userId,
        employeeId,
        email: 'utilisateur@entreprise.ml',
        role: 'ADMINISTRATEUR',
        permissions: ['projects.read', 'dashboard.read'],
        passwordChangedAt: passwordChangedAt.getTime(),
      }),
    );
  });

  it('bloque les autres routes lorsqu’un changement de mot de passe est obligatoire', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: null,
    });
    userRepository.findUnique.mockResolvedValue({
      ...activeAccount,
      mustChangePassword: true,
      passwordChangedAt: null,
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

  it('autorise les routes explicitement prévues pour terminer la première connexion', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: null,
    });
    userRepository.findUnique.mockResolvedValue({
      ...activeAccount,
      mustChangePassword: true,
      passwordChangedAt: null,
    });
    getAllAndOverride.mockReturnValue(true);
    const { context } = createContext('Bearer jeton-premiere-connexion');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('invalide exactement un jeton émis avant une réinitialisation', async () => {
    verifyAsync.mockResolvedValue({
      ...validPayload,
      passwordChangedAt: new Date('2026-08-20T08:00:00.000Z').getTime(),
    });
    userRepository.findUnique.mockResolvedValue(activeAccount);
    const { context } = createContext('Bearer ancien-jeton');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: expect.objectContaining({
        code: TOKEN_REVOKED_CODE,
        statusCode: 401,
      }),
    });
  });

  it('invalide aussi un ancien jeton sans version lorsque le mot de passe a déjà changé', async () => {
    const { passwordChangedAt: _version, ...legacyPayload } = validPayload;
    verifyAsync.mockResolvedValue(legacyPayload);
    userRepository.findUnique.mockResolvedValue(activeAccount);
    const { context } = createContext('Bearer ancien-jeton-sans-version');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({ code: TOKEN_REVOKED_CODE }),
    });
  });

  it('préserve un ancien jeton sans version si aucun mot de passe n’a encore été changé', async () => {
    const { passwordChangedAt: _version, ...legacyPayload } = validPayload;
    verifyAsync.mockResolvedValue(legacyPayload);
    userRepository.findUnique.mockResolvedValue({
      ...activeAccount,
      passwordChangedAt: null,
    });
    const { context } = createContext('Bearer jeton-compatible');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('refuse un compte, un employé ou un rôle devenu inactif', async () => {
    verifyAsync.mockResolvedValue(validPayload);
    userRepository.findUnique.mockResolvedValue({
      ...activeAccount,
      employee: {
        ...activeAccount.employee,
        isActive: false,
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
  });
});
