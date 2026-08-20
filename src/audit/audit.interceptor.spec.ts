import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { lastValueFrom, of, throwError } from 'rxjs';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AuditAction, AuditOutcome } from '../generated/prisma/enums';
import type { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  const recordSafely = jest.fn().mockResolvedValue(undefined);
  const auditService = { recordSafely } as unknown as AuditService;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new AuditInterceptor(auditService);
  });

  function createContext(
    requestOverrides: Partial<Request> & { user?: { sub: string } } = {},
    statusCode = 201,
  ): ExecutionContext {
    const request = {
      method: 'POST',
      originalUrl: '/projects',
      body: {},
      query: {},
      params: {},
      ip: '10.0.0.10',
      socket: { remoteAddress: '10.0.0.10' },
      get: jest.fn().mockReturnValue('PostmanRuntime/7.0'),
      ...requestOverrides,
    };
    const response = { statusCode } as Response;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
        getNext: () => undefined,
      }),
    } as unknown as ExecutionContext;
  }

  it('enregistre une création réussie avec son auteur et sa ressource', async () => {
    const projectId = '018f4d55-9982-4d6b-8f51-a9e5f6b3c210';
    const context = createContext({
      user: { sub: '9c736e1e-94b4-4a48-8c36-497536d8f7a1' },
      body: { name: 'Portail interne' },
    });
    const next = {
      handle: () => of({ id: projectId, name: 'Portail interne' }),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      id: projectId,
      name: 'Portail interne',
    });

    expect(recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '9c736e1e-94b4-4a48-8c36-497536d8f7a1',
        action: AuditAction.CREATE,
        outcome: AuditOutcome.SUCCESS,
        resource: 'projects',
        resourceId: projectId,
        entityLabel: 'Portail interne',
        method: 'POST',
        path: '/projects',
        statusCode: 201,
        ipAddress: '10.0.0.10',
      }),
    );
  });

  it('journalise la connexion sans conserver le mot de passe ni le jeton', async () => {
    const userId = '78a44ded-57da-4df0-b5cd-0610593949c8';
    const context = createContext({
      originalUrl: '/auth/login',
      body: {
        email: 'admin@entreprise.ml',
        password: 'Secret-123!',
      },
    });
    const next = {
      handle: () =>
        of({
          accessToken: 'jwt-tres-secret',
          user: {
            id: userId,
            firstName: 'Aminata',
            lastName: 'Traoré',
          },
        }),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    const event = recordSafely.mock.calls[0][0];
    expect(event).toEqual(
      expect.objectContaining({
        userId,
        action: AuditAction.LOGIN,
        outcome: AuditOutcome.SUCCESS,
        resource: 'auth',
        entityLabel: 'Aminata Traoré',
      }),
    );
    expect(event.metadata.requestBody).toEqual({
      email: 'admin@entreprise.ml',
      password: '[REDACTED]',
    });
    expect(JSON.stringify(event.metadata)).not.toContain('Secret-123!');
    expect(JSON.stringify(event.metadata)).not.toContain('jwt-tres-secret');
  });

  it('enregistre aussi une mutation refusée puis retransmet la même erreur', async () => {
    const context = createContext(
      {
        method: 'PATCH',
        originalUrl: '/interns/intern-1',
        params: { id: 'intern-1' },
        body: { firstName: 'Awa' },
      },
      200,
    );
    const error = new BadRequestException('Données invalides');
    const next = {
      handle: () => throwError(() => error),
    } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error);
    expect(recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.UPDATE,
        outcome: AuditOutcome.FAILURE,
        resource: 'interns',
        statusCode: 400,
      }),
    );
  });

  it('ne journalise pas les simples consultations GET', async () => {
    const context = createContext({ method: 'GET', originalUrl: '/projects' });
    const next = { handle: () => of([]) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual([]);
    expect(recordSafely).not.toHaveBeenCalled();
  });
});
