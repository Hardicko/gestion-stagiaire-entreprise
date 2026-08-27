import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/password-change/allow-password-change-required.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';
export const TOKEN_REVOKED_CODE = 'TOKEN_REVOKED';
export const ACCOUNT_UNAVAILABLE_CODE = 'ACCOUNT_UNAVAILABLE';
export const ACCESS_TOKEN_EXPIRED_CODE = 'ACCESS_TOKEN_EXPIRED';
export const ACCESS_TOKEN_INVALID_CODE = 'ACCESS_TOKEN_INVALID';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Jeton d’authentification absent.');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          statusCode: HttpStatus.UNAUTHORIZED,
          code: ACCESS_TOKEN_EXPIRED_CODE,
          message: 'Le jeton d’accès a expiré.',
        });
      }

      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ACCESS_TOKEN_INVALID_CODE,
        message: 'Jeton d’authentification invalide.',
      });
    }

    if (
      typeof payload?.sub !== 'string' ||
      payload.sub.trim() === '' ||
      typeof payload.sessionId !== 'string' ||
      payload.sessionId.trim() === ''
    ) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ACCESS_TOKEN_INVALID_CODE,
        message: 'Jeton d’authentification invalide.',
      });
    }

    const session = await this.prisma.authSession.findUnique({
      where: {
        id: payload.sessionId,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            employeeId: true,
            isActive: true,
            mustChangePassword: true,
            passwordChangedAt: true,
            employee: {
              select: {
                email: true,
                isActive: true,
              },
            },
            role: {
              select: {
                name: true,
                isActive: true,
                rolePermissions: {
                  where: {
                    permission: {
                      isActive: true,
                    },
                  },
                  select: {
                    permission: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: TOKEN_REVOKED_CODE,
        message: 'Votre session a expiré ou a été révoquée. Reconnectez-vous.',
      });
    }

    const account = session.user;

    if (
      !account.isActive ||
      !account.employee.isActive ||
      !account.role.isActive
    ) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ACCOUNT_UNAVAILABLE_CODE,
        message: 'Compte utilisateur introuvable, désactivé ou indisponible.',
      });
    }

    const currentPasswordChangedAt =
      account.passwordChangedAt?.getTime() ?? null;
    const tokenPasswordChangedAt = payload.passwordChangedAt ?? null;

    if (tokenPasswordChangedAt !== currentPasswordChangedAt) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: TOKEN_REVOKED_CODE,
        message:
          'Votre session a été invalidée après un changement de mot de passe. Reconnectez-vous.',
      });
    }

    request.user = {
      ...payload,
      sessionId: session.id,
      employeeId: account.employeeId,
      email: account.employee.email,
      role: account.role.name,
      permissions: account.role.rolePermissions.map(
        ({ permission }) => permission.code,
      ),
      passwordChangedAt: currentPasswordChangedAt,
    };

    const allowPasswordChangeRequired =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? false;

    if (account.mustChangePassword && !allowPasswordChangeRequired) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        code: PASSWORD_CHANGE_REQUIRED_CODE,
        message: 'Vous devez modifier votre mot de passe avant de continuer.',
      });
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    const [type, token] = authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
