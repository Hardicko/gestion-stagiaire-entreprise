import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  PERMISSIONS_KEY,
  type PermissionRequirement,
} from '../../decorators/permissions/require-permissions.decorator';
import type { AuthenticatedRequest } from '../jwt-auth.guard';

export const MISSING_PERMISSION_CODE = 'MISSING_PERMISSION';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement || requirement.permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('Utilisateur non authentifié.');
    }

    const grantedPermissions = new Set(request.user.permissions ?? []);
    const authorized =
      requirement.mode === 'any'
        ? requirement.permissions.some((code) => grantedPermissions.has(code))
        : requirement.permissions.every((code) => grantedPermissions.has(code));

    if (!authorized) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        code: MISSING_PERMISSION_CODE,
        message: 'Vous n’avez pas la permission nécessaire.',
        requiredPermissions: requirement.permissions,
      });
    }

    return true;
  }
}
