import { CanActivate, ExecutionContext, ForbiddenException,Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationRole} from '../../decorators/roles/roles.decorator'
import { ROLES_KEY } from '../../decorators/roles/roles.decorator';
import { AuthenticatedRequest } from '../jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<ApplicationRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        'Utilisateur non authentifié.',
      );
    }

    const hasRequiredRole = requiredRoles.includes(
      request.user.role as ApplicationRole,
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'Vous n’avez pas la permission nécessaire.',
      );
    }

    return true;
  }
}
