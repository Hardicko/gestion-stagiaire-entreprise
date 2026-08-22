import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../permissions.constants';
import { MISSING_PERMISSION_CODE, PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(reflector);
  });

  function createContext(user?: JwtPayload): ExecutionContext {
    const request = { user };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;
  }

  it('autorise une route sans exigence de permission', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('refuse une route protégée sans utilisateur authentifié', () => {
    getAllAndOverride.mockReturnValue({
      mode: 'all',
      permissions: [PERMISSIONS.PROJECTS_READ],
    });

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('autorise lorsque toutes les permissions demandées sont présentes', () => {
    getAllAndOverride.mockReturnValue({
      mode: 'all',
      permissions: [PERMISSIONS.PROJECTS_READ, PERMISSIONS.PROJECTS_CREATE],
    });

    expect(
      guard.canActivate(
        createContext({
          sub: 'user-id',
          employeeId: 'employee-id',
          email: 'admin@entreprise.ml',
          role: 'ADMINISTRATEUR',
          permissions: [PERMISSIONS.PROJECTS_READ, PERMISSIONS.PROJECTS_CREATE],
        }),
      ),
    ).toBe(true);
  });

  it('refuse et expose un code stable lorsqu’une permission manque', () => {
    getAllAndOverride.mockReturnValue({
      mode: 'all',
      permissions: [PERMISSIONS.USERS_CREATE],
    });

    expect(() =>
      guard.canActivate(
        createContext({
          sub: 'user-id',
          employeeId: 'employee-id',
          email: 'user@entreprise.ml',
          role: 'UTILISATEUR',
          permissions: [PERMISSIONS.PROJECTS_READ],
        }),
      ),
    ).toThrow(
      expect.objectContaining<Partial<ForbiddenException>>({
        response: expect.objectContaining({
          code: MISSING_PERMISSION_CODE,
          statusCode: 403,
          requiredPermissions: [PERMISSIONS.USERS_CREATE],
        }),
      }),
    );
  });
});
